import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type { Prisma, PrismaClient, StudioOutput } from '@muninn/db';
import {
  LIMITS,
  parseCitations,
  podcastScriptSchema,
  type CitationDto,
  type PodcastScript,
  type StudioDocumentType,
} from '@muninn/shared';
import { generateText, Output } from 'ai';
import { type Job, Worker } from 'bullmq';
import { AiService } from '../ai/ai.service.js';
import type { PromptChunk } from '../chat/prompt.js';
import { API_ENV, type ApiEnv } from '../config/env.js';
import { PRISMA } from '../prisma/prisma.module.js';
import { STUDIO_QUEUE_NAME, type StudioJobData } from '../queue/studio-queue.js';
import { StorageService } from '../storage/storage.service.js';
import { selectStudioChunks } from './context.js';
import { encodeMp3 } from './mp3.js';
import {
  buildPodcastPrompt,
  buildStudioDocumentPrompt,
  PODCAST_SYSTEM_PROMPT,
  STUDIO_DOCUMENT_SYSTEM_PROMPT,
  type SourceOverview,
} from './prompts.js';
import { StudioError, studioMessageFor } from './studio-error.js';
import { pcmDurationSec, splitScript, synthesizeDialogue } from './tts.js';

const CONCURRENCY = 2;
const DOCUMENT_MAX_OUTPUT_TOKENS = 8192;
const SCRIPT_MAX_OUTPUT_TOKENS = 12_000;

interface StudioContext {
  sources: SourceOverview[];
  chunks: Array<PromptChunk & { id: string; sourceId: string; charStart: number; charEnd: number }>;
}

/** Consumes the `studio` queue: briefing, FAQ, study guide and the audio overview (PRD §7). */
@Injectable()
export class StudioProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(StudioProcessor.name);
  private worker?: Worker<StudioJobData>;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly storage: StorageService,
    private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<StudioJobData>(STUDIO_QUEUE_NAME, (job) => this.process(job), {
      connection: { url: this.env.REDIS_URL },
      concurrency: CONCURRENCY,
      // An audio overview takes a few minutes; keep the job lock alive meanwhile.
      lockDuration: 5 * 60 * 1000,
    });
    this.worker.on('error', (error) => this.logger.error(`Worker error: ${error.message}`));
    this.logger.log(`Listening on queue "${STUDIO_QUEUE_NAME}"`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  async process(job: Job<StudioJobData>): Promise<void> {
    const { outputId, sourceIds } = job.data;
    const output = await this.prisma.studioOutput.findUnique({ where: { id: outputId } });
    if (!output) return; // Deleted before processing started.

    const startedAt = Date.now();
    await this.prisma.studioOutput.update({
      where: { id: outputId },
      data: { status: 'PROCESSING', error: null },
    });

    try {
      const context = await this.loadContext(output.notebookId, sourceIds);
      if (output.type === 'AUDIO') await this.createAudio(output, context);
      else if (output.type === 'MINDMAP')
        throw new StudioError('Mindmaps werden nicht unterstützt.');
      else await this.createDocument(output, output.type, context);
      this.logger.log(
        `Studio output ${outputId} (${output.type}) ready in ${Date.now() - startedAt} ms`,
      );
    } catch (error) {
      await this.handleFailure(job, outputId, error);
    }
  }

  /** Selected READY sources with their summaries and passages spread over each source. */
  private async loadContext(notebookId: string, sourceIds: string[]): Promise<StudioContext> {
    const sources = await this.prisma.source.findMany({
      where: { notebookId, id: { in: sourceIds }, status: 'READY' },
      select: { id: true, title: true, summary: true },
      orderBy: { createdAt: 'asc' },
    });
    if (sources.length === 0) {
      throw new StudioError('Die ausgewählten Quellen sind nicht mehr verfügbar.');
    }

    const refs = await this.prisma.chunk.findMany({
      where: { sourceId: { in: sources.map((source) => source.id) } },
      select: { id: true, sourceId: true },
      orderBy: { index: 'asc' },
    });
    const bySource = sources.map((source) => refs.filter((ref) => ref.sourceId === source.id));
    const selectedIds = selectStudioChunks(bySource, LIMITS.studioContextChunks).map(
      (ref) => ref.id,
    );

    const chunks = await this.prisma.chunk.findMany({
      where: { id: { in: selectedIds } },
      select: {
        id: true,
        sourceId: true,
        content: true,
        page: true,
        charStart: true,
        charEnd: true,
      },
    });
    const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    const titles = new Map(sources.map((source) => [source.id, source.title]));
    return {
      sources: sources.map(({ title, summary }) => ({ title, summary })),
      chunks: selectedIds.flatMap((id) => {
        const chunk = byId.get(id);
        return chunk ? [{ ...chunk, sourceTitle: titles.get(chunk.sourceId) ?? '' }] : [];
      }),
    };
  }

  private async createDocument(
    output: StudioOutput,
    type: StudioDocumentType,
    context: StudioContext,
  ): Promise<void> {
    const { text, finishReason } = await generateText({
      model: this.ai.studioModel,
      system: STUDIO_DOCUMENT_SYSTEM_PROMPT,
      prompt: buildStudioDocumentPrompt(type, context.sources, context.chunks),
      maxOutputTokens: DOCUMENT_MAX_OUTPUT_TOKENS,
      maxRetries: 2,
      providerOptions: {
        anthropic: { effort: 'medium' },
        google: { thinkingConfig: { thinkingLevel: 'low' } },
      },
    });
    if (!text.trim() || finishReason === 'content-filter') {
      throw new StudioError('Zu diesen Quellen konnte kein Dokument erstellt werden.');
    }

    // Drop citation numbers that do not exist and keep only the cited passages.
    const candidates = context.chunks.map((chunk, index): CitationDto => ({
      n: index + 1,
      chunkId: chunk.id,
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      page: chunk.page,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      excerpt: chunk.content,
    }));
    const parsed = parseCitations(text.trim(), candidates.length);
    const cited = candidates.filter((citation) => parsed.cited.includes(citation.n));
    await this.finish(output.id, {
      content: parsed.text,
      citations: cited as unknown as Prisma.InputJsonValue,
    });
  }

  private async createAudio(output: StudioOutput, context: StudioContext): Promise<void> {
    const model = this.ai.speechModel;
    if (!model) throw new StudioError('Der Rabenbericht ist auf diesem Server nicht aktiviert.');

    // A retry after a TTS failure reuses the script instead of paying for a new one.
    const script =
      parseStoredScript(output.content) ?? (await this.writeScript(output.id, context));
    const segments = splitScript(script.turns, LIMITS.podcastTtsSegmentChars);
    const { pcm, sampleRate } = await synthesizeDialogue(model, this.ai.podcastVoices, segments);
    const mp3 = await encodeMp3(pcm, sampleRate);

    const key = `studio/${output.notebookId}/${output.id}.mp3`;
    await this.storage.put(key, mp3, 'audio/mpeg');
    const stored = await this.finish(output.id, {
      audioStorageKey: key,
      durationSec: pcmDurationSec(pcm.byteLength, sampleRate),
    });
    if (!stored) await this.storage.deleteMany([key]);
  }

  private async writeScript(outputId: string, context: StudioContext): Promise<PodcastScript> {
    const { output: script } = await generateText({
      model: this.ai.studioModel,
      system: PODCAST_SYSTEM_PROMPT,
      prompt: buildPodcastPrompt(context.sources, context.chunks),
      output: Output.object({ schema: podcastScriptSchema }),
      maxOutputTokens: SCRIPT_MAX_OUTPUT_TOKENS,
      maxRetries: 2,
      providerOptions: {
        anthropic: { effort: 'medium' },
        google: { thinkingConfig: { thinkingLevel: 'low' } },
      },
    });
    await this.prisma.studioOutput.updateMany({
      where: { id: outputId },
      data: { content: JSON.stringify(script) },
    });
    return script;
  }

  /** Marks the output READY; false if it was deleted meanwhile. */
  private async finish(
    outputId: string,
    data: Prisma.StudioOutputUpdateManyMutationInput,
  ): Promise<boolean> {
    const { count } = await this.prisma.studioOutput.updateMany({
      where: { id: outputId },
      data: { ...data, status: 'READY', error: null },
    });
    return count > 0;
  }

  /**
   * Marks the output FAILED on the last attempt or for non-retryable errors; otherwise rethrows
   * so BullMQ retries with backoff while the UI keeps showing PROCESSING.
   */
  private async handleFailure(job: Job<StudioJobData>, outputId: string, error: unknown) {
    const stillExists = await this.prisma.studioOutput.count({ where: { id: outputId } });
    if (!stillExists) return; // Deleted while processing.

    const retryable = !(error instanceof StudioError) || error.retryable;
    const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    this.logger.warn(
      `Studio output ${outputId} attempt ${job.attemptsMade + 1} failed: ${error instanceof Error ? error.message : String(error)}`,
    );

    if (retryable && !lastAttempt) throw error;

    await this.prisma.studioOutput.updateMany({
      where: { id: outputId },
      data: { status: 'FAILED', error: studioMessageFor(error) },
    });
  }
}

function parseStoredScript(content: string | null): PodcastScript | null {
  if (!content) return null;
  try {
    const result = podcastScriptSchema.safeParse(JSON.parse(content));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
