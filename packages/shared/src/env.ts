import { z } from 'zod';

/** Parses "true"/"false"/"1"/"0" env strings; anything else is a validation error. */
export const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

/** `provider:model` reference resolved through the AI SDK provider registry. */
export const modelRef = z
  .string()
  .regex(
    /^(google|anthropic):[\w.-]+$/,
    'Expected "<provider>:<model>", e.g. "google:gemini-flash-latest"',
  );

const nodeEnv = z.enum(['development', 'test', 'production']).default('development');

/**
 * Environment of the API and worker process. Validated once at startup (fail fast).
 */
export const apiEnvSchema = z.object({
  NODE_ENV: nodeEnv,
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DOMAIN: z.string().min(1).default('localhost:3000'),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),

  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanFromEnv.default(true),

  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.url(),
  ALLOW_SIGNUP: booleanFromEnv.default(false),

  DEMO_USER_EMAIL: z.email().optional(),
  DEMO_USER_PASSWORD: z.string().min(8).optional(),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  /** Gemini embedding model ID, e.g. `gemini-embedding-2`. */
  EMBEDDING_MODEL: z.string().min(1),
  EMBEDDING_DIM: z.coerce.number().int().positive().max(2000).default(768),
  /** `provider:model` for source summaries, e.g. `google:gemini-flash-latest`. Optional. */
  SUMMARY_MODEL: modelRef.optional(),
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
