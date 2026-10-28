import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type { PrismaClient, Source } from '@muninn/db';
import { type Job, UnrecoverableError, Worker } from 'bullmq';
import { AiService } from '../ai/ai.service.js';
import { API_ENV, type ApiEnv } from '../config/env.js';
import { PRISMA } from '../prisma/prisma.module.js';
import { INGEST_QUEUE_NAME, type IngestJobData } from '../queue/ingest-queue.js';
import { StorageService } from '../storage/storage.service.js';
import { replaceChunks } from './chunk-writer.js';
import { chunkText } from './chunker.js';
import { type ExtractedDocument, normalizeWhitespace } from './extracted.js';
import { IngestError, userMessageFor } from './ingest-error.js';
import { extractPdf } from './pdf.js';
import { summarize } from './summarize.js';
import { extractUrl } from './url.js';

const CONCURRENCY = 2;

/** Consumes the `ingest` queue: extract → chunk → embed → store → summarize (PRD §5). */
@Injectable()
export class IngestProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(IngestProcessor.name);
  private worker?: Worker<IngestJobData>;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly storage: StorageService,
    private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<IngestJobData>(INGEST_QUEUE_NAME, (job) => this.process(job), {
      connection: { url: this.env.REDIS_URL },
      concurrency: CONCURRENCY,
    });
    this.worker.on('error', (error) => this.logger.error(`Worker error: ${error.message}`));
    this.logger.log(`Listening on queue "${INGEST_QUEUE_NAME}"`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  async process(job: Job<IngestJobData>): Promise<void> {
    const { sourceId } = job.data;
    const source = await this.prisma.source.findUnique({ where: { id: sourceId } });
    if (!source) return; // Deleted before processing started.

    const startedAt = Date.now();
    await this.prisma.source.update({
      where: { id: sourceId },
      data: { status: 'PROCESSING', error: null },
    });

    try {
      const document = await this.extract(source);
      const chunks = chunkText(document.text, document.pageOffsets);
      const embeddings = await this.ai.embedDocuments(chunks.map((chunk) => chunk.content));
      await replaceChunks(this.prisma, source, chunks, embeddings);

      const title = document.title ?? source.title;
      const summary = await this.trySummarize(sourceId, title, document.text);
      await this.prisma.source.update({
        where: { id: sourceId },
        data: {
          status: 'READY',
          title,
          extractedText: document.text,
          pageOffsets: document.pageOffsets,
          pageCount: document.pageCount,
          summary,
        },
      });
      this.logger.log(
        `Source ${sourceId} ready: ${chunks.length} chunks in ${Date.now() - startedAt} ms`,
      );
    } catch (error) {
      await this.handleFailure(job, sourceId, error);
    }
  }

  private async extract(source: Source): Promise<ExtractedDocument> {
    switch (source.type) {
      case 'PDF': {
        if (!source.storageKey) throw new Error(`Source ${source.id} has no storage key`);
        return extractPdf(await this.storage.getBytes(source.storageKey));
      }
      case 'URL': {
        if (!source.originalUrl) throw new Error(`Source ${source.id} has no URL`);
        return extractUrl(source.originalUrl);
      }
      case 'TEXT': {
        const text = normalizeWhitespace(source.extractedText ?? '');
        if (!text) throw new IngestError('Der Text ist leer.');
        return { text, pageOffsets: [], pageCount: null };
      }
      case 'YOUTUBE':
        throw new IngestError('YouTube-Quellen werden noch nicht unterstützt.');
    }
  }

  /** Summaries are optional: a failure is logged but never fails the source. */
  private async trySummarize(sourceId: string, title: string, text: string) {
    const model = this.ai.summaryModel;
    if (!model) return null;
    try {
      return await summarize(model, title, text);
    } catch (error) {
      this.logger.warn(`Summary for source ${sourceId} failed: ${String(error)}`);
      return null;
    }
  }

  /**
   * Marks the source FAILED on the last attempt or for non-retryable errors; otherwise rethrows
   * so BullMQ retries with backoff while the UI keeps showing PROCESSING.
   */
  private async handleFailure(job: Job<IngestJobData>, sourceId: string, error: unknown) {
    const stillExists = await this.prisma.source.count({ where: { id: sourceId } });
    if (!stillExists) return; // Deleted while processing.

    const retryable = !(error instanceof IngestError) || error.retryable;
    const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    this.logger.warn(
      `Source ${sourceId} attempt ${job.attemptsMade + 1} failed: ${error instanceof Error ? error.message : String(error)}`,
    );

    if (retryable && !lastAttempt) throw error;

    await this.prisma.source.update({
      where: { id: sourceId },
      data: { status: 'FAILED', error: userMessageFor(error) },
    });
    if (!retryable) throw new UnrecoverableError(userMessageFor(error));
    throw error;
  }
}
