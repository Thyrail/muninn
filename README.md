# Muninn

> In Norse mythology, Muninn ("memory") is one of Odin's two ravens. Every day he flies across
> the world and brings back what he has seen.

Muninn is a NotebookLM-style research assistant: create notebooks, add sources (PDF, URL, text)
and chat with an assistant that answers **only from your sources** and cites every claim.

**Live:** https://muninn.thyrail.de

> Work in progress. The full README (features, screenshots, evaluation results) follows in the
> final phase.

## Stack

pnpm + Turborepo monorepo · Next.js 16 · NestJS 12 · Prisma 7 + PostgreSQL 17 (pgvector) ·
Better Auth · BullMQ + Redis · S3-compatible storage · Docker, Traefik, GitHub Actions.

| Path              | Package          | Purpose                                 |
| ----------------- | ---------------- | --------------------------------------- |
| `apps/web`        | `@muninn/web`    | Next.js frontend                        |
| `apps/api`        | `@muninn/api`    | NestJS API, auth, chat; worker entry    |
| `packages/shared` | `@muninn/shared` | Zod schemas, types, limits, env parsing |
| `packages/db`     | `@muninn/db`     | Prisma schema, migrations, client, seed |
| `infra`           |                  | Docker Compose (dev + prod), env sample |
| `docs`            |                  | PRD, architecture, decision log         |

## Local setup

Requirements: Node 24, pnpm 10, Docker.

```bash
pnpm install
cp infra/.env.example .env          # then set BETTER_AUTH_SECRET (openssl rand -base64 48)
pnpm infra:up                       # Postgres (pgvector), Redis, S3
pnpm db:migrate && pnpm db:seed     # schema + demo user
pnpm dev                            # web on :3000, api on :4000
```

Open http://localhost:3000 and sign in with the demo account from your `.env`.

## Commands

| Command                            | Description                      |
| ---------------------------------- | -------------------------------- |
| `pnpm dev`                         | Run web and api in watch mode    |
| `pnpm typecheck` / `lint` / `test` | Quality gates (also run in CI)   |
| `pnpm db:migrate`                  | Apply migrations                 |
| `pnpm db:migrate:new <name>`       | Create a migration (see ADR-007) |
| `pnpm db:seed`                     | Create or update the demo user   |

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Decision log](docs/DECISIONS.md)

Built with [Claude Code](https://claude.com/claude-code); the working agreement lives in
[CLAUDE.md](CLAUDE.md).
