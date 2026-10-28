import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { API_ENV, type ApiEnv } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Better Auth needs the raw body on its routes; the auth module installs parsers elsewhere.
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  // Behind Traefik: trust the first proxy hop for client IPs and protocol.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.enableShutdownHooks();

  const env = app.get<ApiEnv>(API_ENV);
  await app.listen(env.PORT, '0.0.0.0');
}

void bootstrap();
