import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { createPrismaClient, getEmbeddingDimension, type PrismaClient } from '@muninn/db';
import { API_ENV, type ApiEnv } from '../config/env.js';

/** DI token for the shared Prisma client. Inject with `@Inject(PRISMA) prisma: PrismaClient`. */
export const PRISMA = Symbol('PRISMA');

@Injectable()
class PrismaLifecycle implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('Prisma');

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
    const dimension = await getEmbeddingDimension(this.prisma);
    if (dimension !== this.env.EMBEDDING_DIM) {
      throw new Error(
        `EMBEDDING_DIM=${this.env.EMBEDDING_DIM} does not match chunk.embedding vector(${dimension}). ` +
          'Change the env value or add a migration.',
      );
    }
    this.logger.log('Database connected');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => createPrismaClient(env.DATABASE_URL),
    },
    PrismaLifecycle,
  ],
  exports: [PRISMA],
})
export class PrismaModule {}
