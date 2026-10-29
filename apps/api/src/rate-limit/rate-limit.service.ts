import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { API_ENV, type ApiEnv } from '../config/env.js';

export interface RateLimitRule {
  /** Key prefix, e.g. `chat`. */
  name: string;
  limit: number;
  windowMs: number;
  /** German message for the error response. */
  message: string;
  /** Defaults to 429. */
  status?: HttpStatus;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

const LLM_BUDGET_SUBJECT = 'global';

/** Redis key of the fixed window that `now` falls into (UTC-aligned). */
export function windowKey(
  rule: Pick<RateLimitRule, 'name' | 'windowMs'>,
  subject: string,
  now: number,
): string {
  return `ratelimit:${rule.name}:${subject}:${Math.floor(now / rule.windowMs)}`;
}

/**
 * Fixed-window rate limits per user, counted in Redis so they hold across API restarts and
 * replicas. Each call consumes one unit; the window key expires on its own.
 *
 * Besides the per-user rules, a global daily budget (`DAILY_LLM_REQUEST_CAP`) caps all requests
 * that start model work, as an emergency brake for the public demo.
 */
@Injectable()
export class RateLimitService implements OnApplicationShutdown {
  private readonly redis: Redis;
  private readonly llmBudget: RateLimitRule;

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
    this.llmBudget = {
      name: 'llm-budget',
      limit: env.DAILY_LLM_REQUEST_CAP,
      windowMs: DAY_MS,
      message: 'Muninn hat sein Tagesbudget für heute aufgebraucht. Morgen geht es weiter.',
      status: HttpStatus.SERVICE_UNAVAILABLE,
    };
  }

  /** Consumes one unit or throws (429 by default) when the user exhausted the current window. */
  async consume(rule: RateLimitRule, userId: string): Promise<void> {
    if (!(await this.increment(rule, userId))) {
      throw new HttpException(rule.message, rule.status ?? HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** Consumes one unit of the global daily budget or throws 503. */
  async consumeLlmBudget(): Promise<void> {
    await this.consume(this.llmBudget, LLM_BUDGET_SUBJECT);
  }

  /** Like `consumeLlmBudget`, but returns false instead of throwing (for optional features). */
  async tryConsumeLlmBudget(): Promise<boolean> {
    return this.increment(this.llmBudget, LLM_BUDGET_SUBJECT);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }

  /** Counts one unit; true while the window is within its limit. */
  private async increment(rule: RateLimitRule, subject: string): Promise<boolean> {
    const key = windowKey(rule, subject, Date.now());
    const results = await this.redis.multi().incr(key).pexpire(key, rule.windowMs, 'NX').exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    return count <= rule.limit;
  }
}
