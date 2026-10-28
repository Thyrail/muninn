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

## ADR-006: SeaweedFS as S3-compatible storage instead of MinIO

- **Context:** The stack calls for S3-compatible storage (MinIO locally). MinIO stopped publishing community container images; `minio/mc` is no longer pullable.
- **Decision:** Run SeaweedFS (`chrislusf/seaweedfs`, pinned tag) with its S3 gateway locally and in production. The app only talks to it via `@aws-sdk/client-s3`, so any S3 provider can be swapped in through `S3_*` variables.
- **Alternatives:** Pinning an old, unmaintained MinIO image; a managed S3 bucket.
- **Rationale:** Maintained, small footprint, already proven on the same infrastructure. No vendor lock-in because the code depends on the S3 API only.

## ADR-007: pgvector and full-text columns next to Prisma

- **Context:** Prisma models neither pgvector indexes nor generated columns. A naive `prisma migrate dev` wants to drop the HNSW index and the `GENERATED` expression on `chunk.tsv`.
- **Decision:** `embedding vector(768)` and `tsv tsvector` are `Unsupported(...)` fields. The generated column and the HNSW index (`vector_cosine_ops`) live in hand-written SQL in the init migration; the GIN index is declared in the schema (`@@index([tsv], type: Gin)`). New migrations are created only via `pnpm db:migrate:new <name>`, which strips the two known false-positive statements and deletes migrations that end up empty. Similarity search uses typed raw SQL.
- **Embedding dimension:** 768 (below the HNSW limit of 2000; Gemini embeddings support reduced `outputDimensionality`). The API compares `EMBEDDING_DIM` with the column's dimension at startup and refuses to boot on mismatch.
- **Alternatives:** `db push` without migrations; Drizzle (native pgvector support); a separate vector store.
- **Rationale:** Keeps Prisma's type safety for 95 % of queries and one Postgres for everything, while making the unsupported parts explicit and guarded.
