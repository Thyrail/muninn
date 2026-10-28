import { apiEnvSchema, parseEnv, type ApiEnv } from '@muninn/shared';

/** DI token for the validated API environment. */
export const API_ENV = Symbol('API_ENV');

export type { ApiEnv };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  return parseEnv(apiEnvSchema, source);
}
