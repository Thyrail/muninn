# Architecture Decision Log

Short records of non-trivial decisions: context, decision, alternatives, rationale.
Entries marked **(owner)** were decided by the project owner; the others are technical decisions
made during implementation.

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

## ADR-005: Hosting on a dedicated server (owner)

- **Context:** The existing shared host had ~1.2 GB free RAM and no swap; Muninn runs web, api, worker, Postgres, Redis and S3 plus PDF parsing and ffmpeg peaks.
- **Decision:** Deploy to a separate Hetzner host that only runs Traefik (Let's Encrypt) and Muninn.
- **Alternatives:** The shared host with added swap.
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

## ADR-008: Personal domain and registry (owner)

- **Context:** Muninn is presented as a personal project.
- **Decision:** Public domain `muninn.thyrail.de`, public GitHub repository `Thyrail/muninn`, images in GHCR under the same owner. The domain is configuration only (`DOMAIN`, `BETTER_AUTH_URL`).
- **Alternatives:** A subdomain of another brand; Docker Hub.
- **Rationale:** One consistent identity across code, images and the live demo; GHCR keeps images next to the source and needs no extra credentials in CI.

## ADR-009: Public demo access (owner)

- **Context:** Reviewers need instant access, while every request costs LLM tokens.
- **Decision:** A seeded demo account with a one-click login on the sign-in page (`SHOW_DEMO_LOGIN`). Public sign-up is disabled in production (`ALLOW_SIGNUP=false`) and can be switched on per environment.
- **Alternatives:** Open registration; credentials only in the README.
- **Rationale:** Zero-friction demo without exposing the token budget to anonymous sign-ups. Rate limits and a daily budget follow in the hardening phase.

## ADR-010: Model split per task (owner)

- **Context:** Chat quality, embedding cost and summary latency have different requirements.
- **Decision:** Chat answers use Anthropic Claude. Embeddings use Gemini (`gemini-embedding-2`, 768 dimensions, task types `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`). Source summaries use Gemini Flash (`SUMMARY_MODEL=google:gemini-3.5-flash`, a pinned version instead of a `latest` alias). All model IDs are environment variables; text models are resolved as `provider:model` through the AI SDK provider registry, so switching a task to another provider is a configuration change.
- **Alternatives:** One provider for everything; Claude for summaries.
- **Rationale:** Best answer quality where it matters most, cheap and fast models for background work, and no code change to swap models.

## ADR-011: Character-based chunking at sentence boundaries

- **Context:** The PRD asks for ~800-token chunks with 100 tokens overlap, split at paragraph and sentence boundaries, with page numbers and character offsets for citation highlighting.
- **Decision:** A pure function (`chunkText`) cuts the text into sentences (remembering paragraph starts), fills chunks greedily up to 3,200 characters, prefers ending at a paragraph break once a chunk is 60 % full, and repeats trailing sentences that fit into a 400-character overlap window. Token counts are estimated as `ceil(chars / 4)`. Chunk content is always an exact slice of the source text, and the page is derived from the chunk start via the PDF page offsets.
- **Alternatives:** A real tokenizer (tiktoken or the provider's token counter); LangChain text splitters.
- **Rationale:** No provider-specific tokenizer exists for Gemini embeddings offline, and the 4-characters heuristic is accurate enough for sizing. Exact character offsets matter more than exact token counts, because the source viewer highlights citations by offset. Unit tests cover boundaries, overlap, page mapping and degenerate input.

## ADR-012: Worker as a NestJS application context with BullMQ

- **Context:** Ingestion (download, PDF parsing, embeddings, summary) is slow and must not block HTTP requests; it needs the same configuration, Prisma client, storage and AI services as the API.
- **Decision:** The worker is `NestFactory.createApplicationContext(WorkerModule)` in the API image (`node dist/worker.js`). The API enqueues `{ sourceId }` with `jobId = sourceId`, 3 attempts and exponential backoff. The processor writes all chunks of a source in one transaction after deleting previous ones, so retries are idempotent. Only the last failed attempt (or a non-retryable `IngestError`, e.g. a broken PDF or blocked URL) marks the source `FAILED` with a user-facing German message; summaries are best effort and never fail a source.
- **Alternatives:** Processing inside the API request; `@nestjs/bullmq` decorators; a separate worker package.
- **Rationale:** One codebase and image, full dependency injection, and failure semantics that keep the UI honest (PROCESSING while retrying, a clear error at the end).

## ADR-013: SSRF protection brought forward

- **Context:** URL sources make the server fetch arbitrary user-supplied addresses. The PRD schedules SSRF protection for the hardening phase, but URL sources go live with ingestion.
- **Decision:** Only http(s); IP literals are checked before connecting; all other hosts resolve through a guarded DNS lookup (undici `Agent` with a custom `lookup`) that rejects loopback, private, link-local/metadata, CGNAT, multicast and reserved ranges for IPv4 and IPv6 on every connection, which also covers redirects and DNS rebinding. Redirects are followed manually (max. 3), responses must be HTML, with a 10 s timeout and a 5 MB cap. The worker runs in a network without access to internal services anyway.
- **Alternatives:** Waiting for the hardening phase; an outbound proxy.
- **Rationale:** A public demo must not expose an SSRF hole for days. The guard is small, unit-tested and independent of the rest of the pipeline.

## ADR-014: Claude Sonnet 5.5 for chat at low effort (owner)

- **Context:** Chat answers must cite sources reliably and stream quickly; every question costs money, and the demo is public.
- **Decision:** `CHAT_MODEL=anthropic:claude-sonnet-5-5` with `effort: low` and at most 2,048 output tokens. The API key belongs to a dedicated workspace with a monthly spend limit and auto-reload switched off.
- **Alternatives:** Claude Opus 5.5 (twice the price, no measurable gain for answering from given passages); Claude Haiku 5.5 (much cheaper, but less reliable `[n]` citations); Gemini for everything.
- **Rationale:** Citation quality is what reviewers look at first. Sonnet answers in about 4 seconds with correct citations at roughly 3 to 4 cents per question; low effort is enough because the passages already contain the answer. The model stays a configuration value.

## ADR-015: Hybrid retrieval with RRF and query context without LLM rewriting

- **Context:** PRD §6 asks for vector plus full-text search fused with Reciprocal Rank Fusion, filtered to the notebook and the selected sources, with recent messages flowing into the query.
- **Decision:** Two SQL queries (top 20 each): pgvector cosine distance with `hnsw.iterative_scan = strict_order`, so the HNSW index keeps scanning until enough rows pass the notebook/source filter, and full-text search with `ts_rank_cd`. They are fused with RRF (`k = 60`) into the final top 8 (pure function, unit-tested). Full-text uses an **OR** query of the meaningful words (stopwords removed) instead of `websearch_to_tsquery`, which combines words with AND and rarely matches a natural question. A follow-up question is searched together with the previous user question; there is no LLM query rewriting.
- **Alternatives:** Vector search only; `websearch_to_tsquery` as written in the PRD; LLM rewriting of the question before retrieval.
- **Rationale:** Full text catches names, numbers and rare terms that embeddings blur; OR plus ranking makes it actually contribute. Prepending the previous question resolves most follow-ups ("and how big are they?") without an extra model call, which would add latency and cost to every question.

## ADR-016: Citation protocol

- **Context:** Answers stream token by token, but only at the end is it known which `[n]` the model used, and models occasionally cite numbers that do not exist.
- **Decision:** Passages are numbered 1 to n in the prompt as `<source id="n">` blocks; source content is escaped so it cannot close its block. Before the text streams, the API sends a `data-citations` part with all candidate passages (title, page, offsets, text), so badges have previews while streaming. At the end, a pure parser (`parseCitations`, shared by API and web, unit-tested) removes invalid numbers from the text, the same data part is replaced with only the cited passages, and the cleaned text plus resolved citations are stored. The web renders markers through a remark plugin as badges and hides numbers without a passage, so invalid citations never appear, not even mid-stream. Numbers are not renumbered.
- **Alternatives:** Anthropic's native citations API (provider-specific, and its output format does not map to our chunk offsets); parsing only after the stream (no previews while reading); renumbering cited sources to 1..k (numbers would jump when the stream ends).
- **Rationale:** Provider-independent, stable numbers during and after streaming, and the stored message is clean for reloads and for the conversation history.

## ADR-017: Chat rate limit brought forward

- **Context:** The PRD schedules rate limiting for the hardening phase, but each chat question costs money and the demo account is public from phase 3 on.
- **Decision:** A small Redis fixed-window limiter (`INCR` + `PEXPIRE NX`) enforces 30 questions per hour per user now, answering 429 with a German message. Studio and audio limits plus the global daily cap follow in the hardening phase with the same service.
- **Alternatives:** Waiting for phase 6; relying only on the provider spend limit.
- **Rationale:** The spend limit protects the budget but would turn the demo off for everyone; a per-user limit stops one visitor from using it up.

## ADR-018: Source selection in the client

- **Context:** Users select which sources the chat uses (PRD §2).
- **Decision:** The selection lives in the browser (`localStorage` per notebook, stored as the list of _deselected_ sources so new sources are selected automatically) and is sent with each question. The API checks that the IDs belong to the notebook and are READY.
- **Alternatives:** A `selected` column on `Source`.
- **Rationale:** The selection is a view preference, not data. No extra write per checkbox click, and the server still validates everything it receives.

## ADR-019: Read-aloud via ElevenLabs as an optional extra (owner)

- **Context:** The owner proposed reading chat answers and studio outputs aloud and already has an ElevenLabs account.
- **Decision:** The read-aloud feature is added to the PRD as "Kann" and is only built after phase 5. ElevenLabs is used for it; the podcast stays on Gemini multi-speaker TTS, with ElevenLabs as an optional provider via `PODCAST_TTS_PROVIDER`.
- **Alternatives:** Gemini TTS for read-aloud as well; browser speech synthesis; leaving the feature out.
- **Rationale:** It is a visible extra, but chat with citations and the podcast have priority. Building it last keeps the scope of the core phases unchanged.

## ADR-020: Workspace layout and source viewer

- **Context:** PRD §8 asks for the NotebookLM layout (sources, chat, studio), tabs on mobile, and citations that open the passage they refer to.
- **Decision:** Three columns from `lg` (1024 px) and tabs below. All three panels stay mounted and are only hidden with CSS, so `useChat` state and a running stream survive a tab switch. Clicking a citation opens the source viewer in place of the source list and widens that column. The viewer marks `extractedText.slice(charStart, charEnd)`, split into PDF pages by `pageOffsets` (pure, unit-tested function), and scrolls the mark into view. On mobile it switches to the sources tab. The app shell no longer scrolls the `body`: `main` scrolls, and the notebook page fills the height with one scroll area per column. This also removes the layout jump when a dialog locks scrolling.
- **Alternatives:** A modal or side sheet for the viewer; Radix tabs that unmount inactive panels; a popover with the passage only (as in phase 3).
- **Rationale:** The viewer keeps the chat visible next to the source, so the answer and its evidence can be compared directly. Keeping panels mounted avoids losing a half-streamed answer.

## ADR-021: Suggested questions, generated lazily per set of sources (owner)

- **Context:** The PRD lists three suggested questions per notebook as "Soll". The owner decided to build them in phase 4 for the empty chat.
- **Decision:** `GET /api/notebooks/:id/suggestions` generates three questions with the summary model (Gemini Flash, structured output validated by Zod) from the titles and summaries of READY sources. The result is stored on the notebook together with a SHA-256 key of the sorted READY source IDs. The next request reuses it while the key matches. The web query key contains the same IDs, so a source that finishes or is deleted fetches fresh questions automatically. Errors return an empty list.
- **Alternatives:** Generating the questions in the worker after each ingestion (races with UI polling, and deletes would need their own job); generating them on every page load.
- **Rationale:** One cheap model call per change of the source set, no coordination between worker and UI, and the empty chat never shows an error because of an optional feature.
