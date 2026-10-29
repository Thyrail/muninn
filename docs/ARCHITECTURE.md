# Architecture

Muninn is a NotebookLM-style app: users upload sources into notebooks and chat with an assistant
that answers only from those sources, citing every claim.

```mermaid
flowchart LR
  browser([Browser])

  subgraph edge[Traefik · TLS]
    direction TB
    r_api["Host(DOMAIN) && PathPrefix(/api)"]
    r_web["Host(DOMAIN)"]
  end

  subgraph apps[Application]
    web["web<br/>Next.js · :3000"]
    api["api<br/>NestJS · :4000<br/>REST · Better Auth · chat streaming"]
    worker["worker<br/>same image as api<br/>BullMQ consumers"]
  end

  subgraph data[intern network · not routable]
    pg[("Postgres 17<br/>pgvector · tsvector")]
    redis[("Redis<br/>queues · rate limits")]
    s3[("S3 (SeaweedFS)<br/>uploads · audio")]
  end

  llm{{"LLM APIs<br/>Claude (chat) · Gemini (embeddings, TTS)"}}

  browser --> edge
  r_api --> api
  r_web --> web
  web -- "server components<br/>API_INTERNAL_URL + session cookie" --> api
  api --> pg & redis & s3
  api -- "enqueue jobs" --> redis
  redis -- "ingest · studio" --> worker
  worker --> pg & s3
  api --> llm
  worker --> llm
```

## Ingestion

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant W as web
  participant A as api
  participant S3 as S3
  participant Q as Redis (BullMQ)
  participant K as worker
  participant DB as Postgres
  participant G as Gemini

  U->>W: Add PDF / URL / text
  W->>A: POST /api/notebooks/:id/sources(/file)
  A->>A: ownership, limits, PDF magic bytes
  A->>S3: store PDF
  A->>DB: source (PENDING)
  A->>Q: enqueue { sourceId }
  A-->>W: 201 source
  loop every 2 s while PENDING / PROCESSING
    W->>A: GET /api/notebooks/:id/sources
  end
  Q->>K: job
  K->>DB: PROCESSING
  K->>S3: load PDF (or fetch URL via SSRF guard)
  K->>K: extract text + page offsets, chunk
  K->>G: embed chunks (batches of 100, 768 dims)
  K->>DB: replace chunks + vectors (one transaction)
  K->>G: short summary (Gemini Flash, optional)
  K->>DB: READY (or FAILED with message)
```

## Chat

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant W as web (useChat)
  participant A as api
  participant R as Redis
  participant DB as Postgres
  participant G as Gemini
  participant C as Claude

  U->>W: Question (selected sources)
  W->>A: POST /api/notebooks/:id/chat { text, sourceIds }
  A->>A: ownership, sources READY
  A->>R: rate limit (30 / hour)
  A->>DB: store question, load last 6 messages
  A->>G: embed question + previous question
  par vector
    A->>DB: top 20 by cosine (HNSW, filtered)
  and full text
    A->>DB: top 20 by ts_rank_cd (OR query)
  end
  A->>A: RRF, top 8 passages
  A-->>W: data-citations (all 8 candidates)
  A->>C: system prompt + history + numbered sources
  C-->>A: tokens
  A-->>W: text deltas (rendered with badges)
  A->>A: parseCitations: drop invalid [n]
  A-->>W: data-citations (cited passages only)
  A->>DB: store cleaned answer + citations
```

## Workspace

The notebook page has three columns (sources, chat, studio) from `lg`, and tabs below. All
panels stay mounted, so switching tabs never interrupts a streaming answer (ADR-020).

Clicking a citation badge opens its source in the left column instead of the source list:
`GET /api/sources/:id` returns the extracted text with page offsets. The cited passage is
`text.slice(charStart, charEnd)`, because the chunker keeps exact offsets. The viewer splits
the text into pages, marks the passage and scrolls it into view.

The empty chat shows three suggested questions from `GET /api/notebooks/:id/suggestions`. They
are generated lazily and cached per set of READY sources (ADR-021).

## Key points

- **Same origin.** Traefik routes `/api/*` to NestJS and everything else to Next.js, so cookies
  work without CORS (ADR-002). Locally, Next.js rewrites `/api/*` to `localhost:4000`.
- **One image, two roles.** The API image also runs the worker (`node dist/worker.js`) and the
  one-shot migration job, which applies Prisma migrations and seeds the demo user before the apps
  start.
- **Network isolation.** Postgres, Redis and S3 live in an internal Docker network. Only `web`
  and `api` join the Traefik network; the worker gets a separate egress network for LLM calls.
- **Shared contracts.** `@muninn/shared` holds Zod schemas, limits and env validation used by
  both apps; `@muninn/db` holds the Prisma schema, migrations and client.
- **Retrieval.** Hybrid search: pgvector cosine (HNSW) plus Postgres full-text (OR query of the
  meaningful words), merged with reciprocal rank fusion (ADR-015). Citations follow ADR-016.

See [DECISIONS.md](DECISIONS.md) for the reasoning behind each choice.
