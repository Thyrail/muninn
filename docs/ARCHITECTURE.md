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
- **Retrieval (phase 3).** Hybrid search: pgvector cosine (HNSW) plus Postgres full-text
  (`websearch_to_tsquery`), merged with reciprocal rank fusion.

See [DECISIONS.md](DECISIONS.md) for the reasoning behind each choice.
