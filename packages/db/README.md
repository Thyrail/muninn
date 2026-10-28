# @muninn/db

Prisma schema, migrations and client for Muninn (PostgreSQL 17 + pgvector).

- `pnpm db:migrate` applies pending migrations.
- `pnpm db:migrate:new <name>` creates a migration. Always use this instead of `prisma migrate dev` (see ADR-007).
- `pnpm db:seed` creates or updates the demo user from `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD`.
