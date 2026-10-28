import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { type JobsOptions, Queue } from 'bullmq';
import { API_ENV, type ApiEnv } from '../config/env.js';

export const INGEST_QUEUE_NAME = 'ingest';

export interface IngestJobData {
  sourceId: string;
}

export const INGEST_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

/** Producer side of the ingestion queue (used by the API). */
@Injectable()
export class IngestQueue implements OnApplicationShutdown {
  private readonly queue: Queue<IngestJobData>;

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.queue = new Queue<IngestJobData>(INGEST_QUEUE_NAME, {
      connection: { url: env.REDIS_URL },
    });
  }

  /** One job per source (jobId = sourceId); a finished job for a retried source is replaced. */
  async enqueue(sourceId: string): Promise<void> {
    await this.queue.remove(sourceId);
    await this.queue.add('ingest', { sourceId }, { ...INGEST_JOB_OPTIONS, jobId: sourceId });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}
