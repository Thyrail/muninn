import { S3ServiceException } from '@aws-sdk/client-s3';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PrismaClient, StudioOutput } from '@muninn/db';
import { RATE_LIMITS, type CreateStudioOutputInput, type StudioOutputDto } from '@muninn/shared';
import { API_ENV, type ApiEnv } from '../config/env.js';
import { findOwnedNotebook } from '../notebooks/ownership.js';
import { PRISMA } from '../prisma/prisma.module.js';
import { StudioQueue } from '../queue/studio-queue.js';
import { DAY_MS, RateLimitService, type RateLimitRule } from '../rate-limit/rate-limit.service.js';
import { StorageService, type StoredObjectStream } from '../storage/storage.service.js';
import { toStudioOutputDto } from './studio.mapper.js';

const STUDIO_RATE_LIMIT: RateLimitRule = {
  name: 'studio',
  limit: RATE_LIMITS.studioOutputsPerDay,
  windowMs: DAY_MS,
  message: `Du hast das Limit von ${RATE_LIMITS.studioOutputsPerDay} Studio-Ergebnissen pro Tag erreicht. Bitte versuche es morgen erneut.`,
};

const AUDIO_RATE_LIMIT: RateLimitRule = {
  name: 'audio',
  limit: RATE_LIMITS.audioOverviewsPerDay,
  windowMs: DAY_MS,
  message: `Du hast das Limit von ${RATE_LIMITS.audioOverviewsPerDay} Rabenberichten pro Tag erreicht. Bitte versuche es morgen erneut.`,
};

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly queue: StudioQueue,
    private readonly rateLimit: RateLimitService,
    private readonly storage: StorageService,
  ) {}

  async list(userId: string, notebookId: string): Promise<StudioOutputDto[]> {
    await findOwnedNotebook(this.prisma, userId, notebookId);
    const outputs = await this.prisma.studioOutput.findMany({
      where: { notebookId, type: { not: 'MINDMAP' } },
      orderBy: { createdAt: 'desc' },
    });
    return outputs.map(toStudioOutputDto);
  }

  async create(
    userId: string,
    notebookId: string,
    input: CreateStudioOutputInput,
  ): Promise<StudioOutputDto> {
    await findOwnedNotebook(this.prisma, userId, notebookId);
    if (input.type === 'AUDIO' && !this.env.TTS_MODEL) {
      throw new ServiceUnavailableException(
        'Der Rabenbericht ist auf diesem Server nicht aktiviert.',
      );
    }
    const ready = await this.prisma.source.count({
      where: { notebookId, id: { in: input.sourceIds }, status: 'READY' },
    });
    if (ready === 0) throw new BadRequestException('Wähle mindestens eine fertige Quelle aus.');

    const running = await this.prisma.studioOutput.count({
      where: { notebookId, type: input.type, status: { in: ['PENDING', 'PROCESSING'] } },
    });
    if (running > 0) {
      throw new ConflictException('Dieses Ergebnis wird gerade schon erstellt. Bitte warte kurz.');
    }

    await this.rateLimit.consume(STUDIO_RATE_LIMIT, userId);
    if (input.type === 'AUDIO') await this.rateLimit.consume(AUDIO_RATE_LIMIT, userId);
    await this.rateLimit.consumeLlmBudget();

    const output = await this.prisma.studioOutput.create({
      data: { notebookId, type: input.type },
    });
    try {
      await this.queue.enqueue({ outputId: output.id, sourceIds: input.sourceIds });
      return toStudioOutputDto(output);
    } catch (error) {
      this.logger.error(`Could not enqueue studio output ${output.id}: ${String(error)}`);
      const failed = await this.prisma.studioOutput.update({
        where: { id: output.id },
        data: {
          status: 'FAILED',
          error: 'Die Erstellung konnte nicht gestartet werden. Bitte versuche es erneut.',
        },
      });
      return toStudioOutputDto(failed);
    }
  }

  async remove(userId: string, outputId: string): Promise<void> {
    const output = await this.findOwned(userId, outputId);
    await this.prisma.studioOutput.delete({ where: { id: outputId } });
    if (output.audioStorageKey) await this.storage.deleteMany([output.audioStorageKey]);
  }

  /** The MP3 of a finished audio overview, optionally a byte range for seeking. */
  async audio(userId: string, outputId: string, range?: string): Promise<StoredObjectStream> {
    const output = await this.findOwned(userId, outputId);
    if (output.status !== 'READY' || !output.audioStorageKey) {
      throw new NotFoundException('Für dieses Ergebnis gibt es kein Audio.');
    }
    try {
      return await this.storage.getStream(output.audioStorageKey, range);
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 416) {
        throw new HttpException('Ungültiger Bereich.', HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
      }
      throw error;
    }
  }

  /** Foreign and unknown IDs both yield 404 (see `findOwnedNotebook`). */
  private async findOwned(userId: string, outputId: string): Promise<StudioOutput> {
    const output = await this.prisma.studioOutput.findFirst({
      where: { id: outputId, notebook: { userId } },
    });
    if (!output) throw new NotFoundException('Ergebnis nicht gefunden.');
    return output;
  }
}
