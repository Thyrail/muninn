import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Local dev keeps a single .env at the repo root; in containers variables come from the runtime.
config({ path: new URL('../../.env', import.meta.url).pathname, quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node dist/seed.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
