import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

/**
 * Reads the dimension of `chunk.embedding` from the catalog. For `vector(N)` pgvector stores N
 * directly in `atttypmod`. Used at startup to fail fast if EMBEDDING_DIM and the schema disagree.
 */
export async function getEmbeddingDimension(prisma: PrismaClient): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ dim: number }[]>`
    SELECT a.atttypmod AS dim
    FROM pg_attribute a
    WHERE a.attrelid = 'chunk'::regclass AND a.attname = 'embedding'
  `;
  return rows[0]?.dim ?? null;
}
