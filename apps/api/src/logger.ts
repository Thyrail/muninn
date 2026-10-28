import type { Params } from 'nestjs-pino';
import type { ApiEnv } from './config/env.js';

/** Structured logging. Credentials and cookies are redacted; request bodies are never logged. */
export function loggerOptions(env: Pick<ApiEnv, 'NODE_ENV' | 'LOG_LEVEL'>): Params {
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      redact: {
        paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
        censor: '[redacted]',
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
    },
  };
}
