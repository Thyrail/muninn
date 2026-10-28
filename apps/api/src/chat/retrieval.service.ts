import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@muninn/db';
import { LIMITS } from '@muninn/shared';
import { AiService } from '../ai/ai.service.js';
import { toVectorLiteral } from '../ingest/chunk-writer.js';
import { PRISMA } from '../prisma/prisma.module.js';
import { toOrTsQuery } from './fts-query.js';
import { fuseRankings } from './rank-fusion.js';

export interface RetrievedChunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  content: string;
  page: number | null;
  charStart: number;
  charEnd: number;
}

interface Scope {
  notebookId: string;
  sourceIds: string[];
}

/**
 * Hybrid search (PRD §6): vector similarity and full-text search, each limited to the
 * notebook and the selected sources, fused with Reciprocal Rank Fusion.
 */
@Injectable()
export class RetrievalService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly ai: AiService,
  ) {}

  async retrieve(scope: Scope, query: string): Promise<RetrievedChunk[]> {
    const embedding = await this.ai.embedQuery(query);
    const [byVector, byText] = await Promise.all([
      this.vectorSearch(scope, embedding),
      this.textSearch(scope, query),
    ]);
    const ids = fuseRankings([byVector, byText], LIMITS.chatContextChunks);
    if (ids.length === 0) return [];

    const chunks = await this.prisma.chunk.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        sourceId: true,
        content: true,
        page: true,
        charStart: true,
        charEnd: true,
        source: { select: { title: true } },
      },
    });
    const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    return ids.flatMap((id) => {
      const chunk = byId.get(id);
      if (!chunk) return [];
      const { source, ...rest } = chunk;
      return [{ ...rest, sourceTitle: source.title }];
    });
  }

  private async vectorSearch(scope: Scope, embedding: number[]): Promise<string[]> {
    return this.prisma.$transaction(async (tx) => {
      // The HNSW index is filtered afterwards by notebook and sources; iterative scans keep
      // searching until enough rows pass the filter (pgvector >= 0.8).
      await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = strict_order`;
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM chunk
        WHERE "notebookId" = ${scope.notebookId}
          AND "sourceId" IN (${Prisma.join(scope.sourceIds)})
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${toVectorLiteral(embedding)}::vector
        LIMIT ${LIMITS.chatRetrievalTopK}`;
      return rows.map((row) => row.id);
    });
  }

  private async textSearch(scope: Scope, query: string): Promise<string[]> {
    const tsQuery = toOrTsQuery(query);
    if (!tsQuery) return [];
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM chunk
      WHERE "notebookId" = ${scope.notebookId}
        AND "sourceId" IN (${Prisma.join(scope.sourceIds)})
        AND tsv @@ to_tsquery('simple', ${tsQuery})
      ORDER BY ts_rank_cd(tsv, to_tsquery('simple', ${tsQuery})) DESC, index
      LIMIT ${LIMITS.chatRetrievalTopK}`;
    return rows.map((row) => row.id);
  }
}
