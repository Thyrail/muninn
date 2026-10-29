import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AiModule } from './ai/ai.module.js';
import { ConfigModule } from './config/config.module.js';
import { API_ENV, type ApiEnv } from './config/env.js';
import { DemoWorkerModule } from './demo/demo.module.js';
import { IngestModule } from './ingest/ingest.module.js';
import { loggerOptions } from './logger.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { StudioWorkerModule } from './studio/studio-worker.module.js';

/** Background worker: same configuration and services as the API, no HTTP server. */
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => loggerOptions(env),
    }),
    PrismaModule,
    StorageModule,
    AiModule,
    IngestModule,
    StudioWorkerModule,
    DemoWorkerModule,
  ],
})
export class WorkerModule {}
