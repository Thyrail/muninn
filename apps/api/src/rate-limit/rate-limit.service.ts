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
  /** German message for the 429 response. */
  message: string;
}

/**
 * Fixed-window rate limits per user, counted in Redis so they hold across API restarts and
 * replicas. Each call consumes one unit; the window key expires on its own.
 */
@Injectable()
export class RateLimitService implements OnApplicationShutdown {
  private readonly redis: Redis;

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
  }

  /** Consumes one unit or throws 429 when the user exhausted the current window. */
  async consume(rule: RateLimitRule, userId: string): Promise<void> {
    const window = Math.floor(Date.now() / rule.windowMs);
    const key = `ratelimit:${rule.name}:${userId}:${window}`;
    const results = await this.redis
      .multi()
      .incr(key)
      .pexpire(key, rule.windowMs, 'NX')
      .exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    if (count > rule.limit) {
      throw new HttpException(rule.message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
