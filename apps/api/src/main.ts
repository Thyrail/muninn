import 'reflect-metadata';
import { securityHeaders } from '@muninn/shared';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';
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
  const headers = securityHeaders(env.NODE_ENV === 'production');
  app.use((_request: unknown, response: Response, next: () => void) => {
    for (const { key, value } of headers) response.setHeader(key, value);
    next();
  });
  await app.listen(env.PORT, '0.0.0.0');
}

void bootstrap();
