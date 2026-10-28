# Architecture Decision Log

Short records of non-trivial decisions: context, decision, alternatives, rationale.

---

## ADR-001: pnpm + Turborepo monorepo

- **Context:** Web (Next.js), API (NestJS) and worker share types, Zod schemas, limits and the Prisma client.
- **Decision:** One repository with pnpm workspaces and Turborepo: `apps/web`, `apps/api`, `packages/shared`, `packages/db`.
- **Alternatives:** Separate repos; Next.js-only app with route handlers.
- **Rationale:** A single source of truth for schemas and limits, atomic changes across the stack, and Turbo caching/pruning for lean Docker images. A separate API keeps long-running work (streaming, ingestion, TTS) out of the web runtime.

## ADR-002: Same origin via Traefik path routing

- **Context:** Browser talks to web and API; Better Auth uses cookie sessions.
- **Decision:** Traefik routes `Host(DOMAIN) && PathPrefix(/api)` to the API and everything else on `Host(DOMAIN)` to Next.js. Locally, Next.js `rewrites` proxy `/api/*` to `localhost:4000`.
- **Alternatives:** `api.` subdomain with CORS and cross-site cookies; proxying all API traffic through Next.js.
- **Rationale:** No CORS, plain `sameSite=lax` cookies, and streaming responses go straight to NestJS without an extra hop.

## ADR-003: TypeScript 6.0 instead of 7.0

- **Context:** TypeScript 7 (native compiler) is `latest` on npm.
- **Decision:** Pin TypeScript `~6.0`.
- **Alternatives:** TypeScript 7.
- **Rationale:** `@nestjs/cli` and `typescript-eslint` declare `~6.0` / `<6.1` as supported. NestJS dependency injection relies on `emitDecoratorMetadata`; staying on the supported compiler avoids surprises under a seven-day deadline.

## ADR-004: Prisma 7.10 instead of 8.0 release candidate

- **Context:** npm `latest` of the `prisma` CLI points to an 8.0 release candidate.
- **Decision:** Pin Prisma 7.10 with the `prisma-client` generator (ESM) and the `@prisma/adapter-pg` driver adapter.
- **Alternatives:** Prisma 8 RC; Drizzle.
- **Rationale:** Better Auth's Prisma adapter supports Prisma ≤ 7, and an RC is not a base for a live demo. pgvector columns are modelled as `Unsupported("vector(768)")` and queried with typed raw SQL.

## ADR-005: Hosting on jupiter

- **Context:** saturn (existing demo host) had ~1.2 GB free RAM and no swap; Muninn runs web, api, worker, Postgres, Redis and MinIO plus PDF parsing and ffmpeg peaks.
- **Decision:** Deploy to the second Hetzner host (jupiter), which already runs Traefik with Let's Encrypt.
- **Alternatives:** saturn with added swap.
- **Rationale:** Enough headroom without risking existing sites. Databases live in an internal Docker network only; just `web` and `api` join the Traefik network.
