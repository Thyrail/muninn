import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { PrismaClient } from '@muninn/db';
import type { PublicConfig } from '@muninn/shared';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { API_ENV, type ApiEnv } from '../config/env.js';
import { PRISMA } from '../prisma/prisma.module.js';

@Controller()
@AllowAnonymous()
export class HealthController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  @Get('health')
  async health(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok' };
  }

  @Get('config')
  config(): PublicConfig {
    return { allowSignup: this.env.ALLOW_SIGNUP };
  }
}
