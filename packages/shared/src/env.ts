import { z } from 'zod';

/** Parses "true"/"false"/"1"/"0" env strings; anything else is a validation error. */
export const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const nodeEnv = z.enum(['development', 'test', 'production']).default('development');

/**
 * Environment of the API and worker process. Validated once at startup (fail fast).
 * LLM, queue and storage settings are optional until the phases that use them.
 */
export const apiEnvSchema = z.object({
  NODE_ENV: nodeEnv,
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DOMAIN: z.string().min(1).default('localhost:3000'),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().optional(),

  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.url(),
  ALLOW_SIGNUP: booleanFromEnv.default(false),

  DEMO_USER_EMAIL: z.email().optional(),
  DEMO_USER_PASSWORD: z.string().min(8).optional(),

  EMBEDDING_DIM: z.coerce.number().int().positive().max(2000).default(768),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

/** Formats Zod issues as one line per variable without echoing values (they may be secrets). */
export function formatEnvIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

/**
 * Parses `source` (usually `process.env`) against `schema` and throws a readable error listing
 * invalid variables. Takes the source explicitly so this package stays runtime-agnostic.
 */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${formatEnvIssues(result.error)}`);
  }
  return result.data;
}
