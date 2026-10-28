import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { PrismaClient } from '@muninn/db';
import { LoggerModule } from 'nestjs-pino';
import { createAuth } from './auth/auth.factory.js';
import { ConfigModule } from './config/config.module.js';
import { API_ENV, type ApiEnv } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { MeController } from './me/me.controller.js';
import { PRISMA, PrismaModule } from './prisma/prisma.module.js';
import { loggerOptions } from './logger.js';
import { AiModule } from './ai/ai.module.js';
import { ChatModule } from './chat/chat.module.js';
import { NotebooksModule } from './notebooks/notebooks.module.js';
import { QueueModule } from './queue/queue.module.js';
import { RateLimitModule } from './rate-limit/rate-limit.module.js';
import { SourcesModule } from './sources/sources.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => loggerOptions(env),
    }),
    PrismaModule,
    AuthModule.forRootAsync({
      inject: [PRISMA, API_ENV],
      useFactory: (prisma: PrismaClient, env: ApiEnv) => ({
        auth: createAuth(prisma, env),
        // Pasted text sources can be up to 200k characters (~400 KB as UTF-8 JSON).
        bodyParser: { json: { limit: '1mb' } },
      }),
    }),
    StorageModule,
    QueueModule,
    RateLimitModule,
    AiModule,
    NotebooksModule,
    SourcesModule,
    ChatModule,
  ],
  controllers: [HealthController, MeController],
})
export class AppModule {}
