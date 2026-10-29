// Manual demo reset (`node dist/demo-reset.js`), e.g. after curating the demo notebook or to
// test the nightly job. Shares configuration and services with the worker.
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger, LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module.js';
import { API_ENV, type ApiEnv } from './config/env.js';
import { DemoModule } from './demo/demo.module.js';
import { DemoResetService } from './demo/demo-reset.service.js';
import { loggerOptions } from './logger.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => loggerOptions(env),
    }),
    PrismaModule,
    StorageModule,
    DemoModule,
  ],
})
class DemoResetCommandModule {}

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(DemoResetCommandModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  try {
    const result = await app.get(DemoResetService).reset();
    if (!result) app.get(Logger).warn('No demo account configured, nothing to reset.');
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  console.error('Demo reset failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
