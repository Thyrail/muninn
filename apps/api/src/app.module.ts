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
      useFactory: (prisma: PrismaClient, env: ApiEnv) => ({ auth: createAuth(prisma, env) }),
    }),
  ],
  controllers: [HealthController, MeController],
})
export class AppModule {}
