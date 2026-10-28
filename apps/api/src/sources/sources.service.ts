import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { PrismaClient, Source } from '@muninn/db';
import {
  hasPdfSignature,
  LIMITS,
  MAX_SOURCE_TITLE_LENGTH,
  type CreateSourceInput,
  type SourceDetailDto,
  type SourceDto,
} from '@muninn/shared';
import { findOwnedNotebook, findOwnedSource } from '../notebooks/ownership.js';
import { PRISMA } from '../prisma/prisma.module.js';
import { IngestQueue } from '../queue/ingest-queue.js';
import { StorageService } from '../storage/storage.service.js';
import {
  titleFromFileName,
  titleFromText,
  toSourceDetailDto,
  toSourceDto,
} from './source.mapper.js';

export interface UploadedPdf {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Title for URL sources until the worker has read the page title. */
const URL_TITLE_MAX = 120;
const TEXT_TITLE_MAX = 80;

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
    private readonly queue: IngestQueue,
  ) {}

  async list(userId: string, notebookId: string): Promise<SourceDto[]> {
    await findOwnedNotebook(this.prisma, userId, notebookId);
    const sources = await this.prisma.source.findMany({
      where: { notebookId },
      orderBy: { createdAt: 'asc' },
    });
    return sources.map(toSourceDto);
  }

  async get(userId: string, sourceId: string): Promise<SourceDetailDto> {
    return toSourceDetailDto(await findOwnedSource(this.prisma, userId, sourceId));
  }

  async addPdf(
    userId: string,
    notebookId: string,
    file: UploadedPdf | undefined,
  ): Promise<SourceDto> {
    if (!file) throw new BadRequestException('Bitte wähle eine PDF-Datei aus.');
    if (file.mimetype !== 'application/pdf' || !hasPdfSignature(file.buffer)) {
      throw new UnsupportedMediaTypeException('Es werden nur PDF-Dateien unterstützt.');
    }
    await this.assertCanAddSource(userId, notebookId);

    const storageKey = `notebooks/${notebookId}/sources/${randomUUID()}.pdf`;
    await this.storage.put(storageKey, file.buffer, 'application/pdf');
    try {
      const source = await this.prisma.source.create({
        data: {
          notebookId,
          type: 'PDF',
          title: titleFromFileName(file.originalname, MAX_SOURCE_TITLE_LENGTH),
          storageKey,
        },
      });
      return await this.startIngestion(source);
    } catch (error) {
      await this.storage.deleteMany([storageKey]);
      throw error;
    }
  }

  async addFromInput(
    userId: string,
    notebookId: string,
    input: CreateSourceInput,
  ): Promise<SourceDto> {
    await this.assertCanAddSource(userId, notebookId);
    const source =
      input.type === 'URL'
        ? await this.prisma.source.create({
            data: {
              notebookId,
              type: 'URL',
              title: new URL(input.url).hostname.slice(0, URL_TITLE_MAX),
              originalUrl: input.url,
            },
          })
        : await this.prisma.source.create({
            data: {
              notebookId,
              type: 'TEXT',
              title: input.title || titleFromText(input.text, TEXT_TITLE_MAX),
              extractedText: input.text,
            },
          });
    return this.startIngestion(source);
  }

  async retry(userId: string, sourceId: string): Promise<SourceDto> {
    const source = await findOwnedSource(this.prisma, userId, sourceId);
    if (source.status !== 'FAILED') {
      throw new ConflictException('Nur fehlgeschlagene Quellen können erneut verarbeitet werden.');
    }
    const reset = await this.prisma.source.update({
      where: { id: sourceId },
      data: { status: 'PENDING', error: null },
    });
    return this.startIngestion(reset);
  }

  async remove(userId: string, sourceId: string): Promise<void> {
    const source = await findOwnedSource(this.prisma, userId, sourceId);
    await this.prisma.source.delete({ where: { id: sourceId } });
    await this.touchNotebook(source.notebookId);
    if (source.storageKey) await this.storage.deleteMany([source.storageKey]);
  }

  private async assertCanAddSource(userId: string, notebookId: string): Promise<void> {
    await findOwnedNotebook(this.prisma, userId, notebookId);
    const count = await this.prisma.source.count({ where: { notebookId } });
    if (count >= LIMITS.maxSourcesPerNotebook) {
      throw new ConflictException(
        `Ein Notebook kann höchstens ${LIMITS.maxSourcesPerNotebook} Quellen enthalten.`,
      );
    }
  }

  /** Queues the source; if Redis is unavailable the source is marked failed so it can be retried. */
  private async startIngestion(source: Source): Promise<SourceDto> {
    await this.touchNotebook(source.notebookId);
    try {
      await this.queue.enqueue(source.id);
      return toSourceDto(source);
    } catch (error) {
      this.logger.error(`Could not enqueue source ${source.id}: ${String(error)}`);
      const failed = await this.prisma.source.update({
        where: { id: source.id },
        data: {
          status: 'FAILED',
          error: 'Die Verarbeitung konnte nicht gestartet werden. Bitte versuche es erneut.',
        },
      });
      return toSourceDto(failed);
    }
  }

  private async touchNotebook(notebookId: string): Promise<void> {
    await this.prisma.notebook.update({
      where: { id: notebookId },
      data: { updatedAt: new Date() },
    });
  }
}
