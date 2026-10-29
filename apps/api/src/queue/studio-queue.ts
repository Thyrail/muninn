import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { type JobsOptions, Queue } from 'bullmq';
import { API_ENV, type ApiEnv } from '../config/env.js';

export const STUDIO_QUEUE_NAME = 'studio';

export interface StudioJobData {
  outputId: string;
  /** Selected sources at the time of the request (the selection lives in the client). */
  sourceIds: string[];
}

export const STUDIO_JOB_OPTIONS: JobsOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

/** Producer side of the studio queue (used by the API). */
@Injectable()
export class StudioQueue implements OnApplicationShutdown {
  private readonly queue: Queue<StudioJobData>;

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.queue = new Queue<StudioJobData>(STUDIO_QUEUE_NAME, {
      connection: { url: env.REDIS_URL },
    });
  }

  /** One job per output (jobId = outputId). */
  async enqueue(data: StudioJobData): Promise<void> {
    await this.queue.add('studio', data, { ...STUDIO_JOB_OPTIONS, jobId: data.outputId });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}
