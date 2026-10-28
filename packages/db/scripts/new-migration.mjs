// Creates a Prisma migration and strips statements Prisma emits for features it cannot model:
// the pgvector HNSW index and the generated tsvector column. Applying those statements would
// silently break retrieval, so every schema change must go through this script.
//
// Usage: pnpm db:migrate:new <name>
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error('Usage: pnpm db:migrate:new <snake_case_name>');
  process.exit(1);
}

const migrationsDir = new URL('../prisma/migrations/', import.meta.url).pathname;
const before = new Set(readdirSync(migrationsDir));

execFileSync('prisma', ['migrate', 'dev', '--create-only', '--name', name], { stdio: 'inherit' });

const created = readdirSync(migrationsDir).find((entry) => !before.has(entry));
if (!created) {
  console.log('No migration created.');
  process.exit(0);
}

const file = join(migrationsDir, created, 'migration.sql');
const KNOWN_FALSE_POSITIVES = [
  /^-- DropIndex\nDROP INDEX "chunk_embedding_hnsw_idx";\n*/m,
  /^-- AlterTable\nALTER TABLE "chunk" ALTER COLUMN "tsv" DROP DEFAULT;\n*/m,
];

let sql = readFileSync(file, 'utf8');
for (const pattern of KNOWN_FALSE_POSITIVES) sql = sql.replace(pattern, '');

const hasStatements = sql
  .split('\n')
  .some((line) => line.trim() !== '' && !line.trim().startsWith('--'));

if (!hasStatements) {
  rmSync(join(migrationsDir, created), { recursive: true });
  console.log('Schema is in sync, nothing to migrate.');
  process.exit(0);
}

writeFileSync(file, sql.trimEnd() + '\n');
console.log(`Created ${created}. Review it, then run: pnpm db:migrate`);
