import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@muninn/db';
import type { TextChunk } from './chunker.js';

const INSERT_BATCH = 50;

/** pgvector text format: "[0.1,0.2,...]". */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

/**
 * Replaces all chunks of a source in one transaction, so retries are idempotent and readers
 * never see a half-written source. Embeddings go through raw SQL (Unsupported column, ADR-007).
 */
export async function replaceChunks(
  prisma: PrismaClient,
  source: { id: string; notebookId: string },
  chunks: TextChunk[],
  embeddings: number[][],
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error(`Got ${embeddings.length} embeddings for ${chunks.length} chunks`);
  }
  await prisma.$transaction(
    async (tx) => {
      await tx.chunk.deleteMany({ where: { sourceId: source.id } });
      for (let start = 0; start < chunks.length; start += INSERT_BATCH) {
        const rows = chunks.slice(start, start + INSERT_BATCH).map(
          (chunk, offset) => Prisma.sql`(
            ${randomUUID()}, ${source.id}, ${source.notebookId}, ${chunk.index}, ${chunk.content},
            ${chunk.page}, ${chunk.charStart}, ${chunk.charEnd}, ${chunk.tokenCount},
            ${toVectorLiteral(embeddings[start + offset]!)}::vector
          )`,
        );
        await tx.$executeRaw`
          INSERT INTO chunk (id, "sourceId", "notebookId", index, content, page,
                             "charStart", "charEnd", "tokenCount", embedding)
          VALUES ${Prisma.join(rows)}`;
      }
    },
    { timeout: 60_000 },
  );
}
