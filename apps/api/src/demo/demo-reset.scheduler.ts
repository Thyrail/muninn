import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { API_ENV, type ApiEnv } from '../config/env.js';
import { DemoResetService } from './demo-reset.service.js';

export const MAINTENANCE_QUEUE_NAME = 'maintenance';
const DEMO_RESET_SCHEDULER_ID = 'demo-reset';
const DEMO_RESET_TIMEZONE = 'Europe/Berlin';

/**
 * Runs the demo reset nightly through a BullMQ job scheduler. Upserting is idempotent, so every
 * worker start (re)applies the configured cron pattern; without a demo user it is removed.
 */
@Injectable()
export class DemoResetScheduler implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DemoResetScheduler.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly demoReset: DemoResetService,
  ) {}

  async onModuleInit(): Promise<void> {
    const connection = { url: this.env.REDIS_URL };
    this.queue = new Queue(MAINTENANCE_QUEUE_NAME, { connection });
    if (!this.env.DEMO_USER_EMAIL) {
      await this.queue.removeJobScheduler(DEMO_RESET_SCHEDULER_ID);
      return;
    }

    await this.queue.upsertJobScheduler(
      DEMO_RESET_SCHEDULER_ID,
      { pattern: this.env.DEMO_RESET_CRON, tz: DEMO_RESET_TIMEZONE },
      {
        name: DEMO_RESET_SCHEDULER_ID,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: 30,
        },
      },
    );
    this.worker = new Worker(MAINTENANCE_QUEUE_NAME, () => this.demoReset.reset(), {
      connection,
    });
    this.worker.on('error', (error) => this.logger.error(`Worker error: ${error.message}`));
    this.worker.on('failed', (_job, error) =>
      this.logger.error(`Demo reset failed: ${error.message}`),
    );
    this.logger.log(`Demo reset scheduled (${this.env.DEMO_RESET_CRON}, ${DEMO_RESET_TIMEZONE})`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
