# CLAUDE.md – Muninn

## Kontext
Dies ist eine Bewerbungsaufgabe: **Muninn**, ein Klon von Google NotebookLM. Abgabe in 7 Tagen
mit GitHub-Repo, Live-Deployment auf `https://muninn.thyrail.de` und einem Loom-Video
(max. 10 Min.).
Bewertet werden Vorgehen, Architektur, Codequalität und eine funktionierende Live-Demo.
Die vollständige Spezifikation steht in `docs/PRD.md`. Lies sie vor jeder neuen Phase.

## Naming
- Produktname: **Muninn** (in Odins Mythologie der Rabe der Erinnerung). Schreibweise im UI
  immer „Muninn“, technisch kleingeschrieben `muninn`.
- Repo: `muninn`, Package-Scope: `@muninn/*` (z. B. `@muninn/web`, `@muninn/api`,
  `@muninn/shared`, `@muninn/db`), Docker-Compose-Projektname: `muninn`.
- Podcast-Hosts der Audio Overview: **Hugin** (der Gedanke, neugierig, stellt die Fragen)
  und **Munin** (die Erinnerung, kennt die Quellen, erklärt). Die beiden Raben sind das
  Leitmotiv für Logo und Branding: dezent, nicht verspielt.

## Arbeitsweise (verbindlich)
- Arbeite strikt in den Phasen aus `docs/PRD.md`. Beginne jede Phase im Plan Mode,
  stelle den Plan vor und warte auf mein OK, bevor du Code schreibst.
- Nach jeder Phase: `pnpm typecheck && pnpm lint && pnpm test` muss grün sein,
  dann ein Commit pro logischer Einheit (Conventional Commits, englisch).
  Gehe nicht ohne mein OK zur nächsten Phase.
- Recherchiere aktuelle APIs und Versionen über das Context7-MCP bzw. die offizielle Doku,
  bevor du Bibliotheken einsetzt (Next.js, Tailwind, Prisma, Vercel AI SDK, Better Auth,
  BullMQ, Google Gen AI SDK). Verlasse dich nicht auf veraltetes Wissen.
- Modell-IDs (Chat, Embeddings, TTS) niemals hardcoden, immer über ENV-Variablen.
  Prüfe die aktuell verfügbaren Modell-IDs in der Doku des Anbieters.
- Jede nicht-triviale Architekturentscheidung bekommt einen kurzen Eintrag in
  `docs/DECISIONS.md` (Kontext, Entscheidung, Alternativen, Begründung).
- Wenn etwas unklar ist oder eine Anforderung mehr als ca. 2 Stunden extra kostet: frag mich.
- Lieber weniger Features, dafür poliert und stabil. Scope-Prioritäten stehen im PRD.

## Tech-Stack (verbindlich)
- Monorepo: pnpm Workspaces + Turborepo, TypeScript strict überall
- `apps/web` (`@muninn/web`): Next.js (aktuelle stabile Version, App Router, `output: 'standalone'`),
  Tailwind CSS v4, shadcn/ui, TanStack Query, Vercel AI SDK (`useChat`), react-markdown
- `apps/api` (`@muninn/api`): NestJS (Express-Adapter) – REST-API, Auth, Chat-Streaming
  und BullMQ-Worker (gleiches Image, separater Entry-Point `dist/worker.js`)
- `packages/shared` (`@muninn/shared`): Zod-Schemas, gemeinsame Typen, Konstanten (Limits)
- `packages/db` (`@muninn/db`): Prisma-Schema + Client (PostgreSQL 17 mit pgvector)
- Queue: BullMQ + Redis
- Storage: S3-kompatibel (`@aws-sdk/client-s3`) – lokal MinIO, prod per ENV konfigurierbar
- LLM: Vercel AI SDK mit Provider-Abstraktion. Chat-Antworten: Anthropic Claude.
  Embeddings und Multi-Speaker-TTS: Google Gemini. Provider per ENV austauschbar.
- Auth: Better Auth (E-Mail/Passwort), Prisma-Adapter, gemountet in NestJS unter `/api/auth/*`
- Tests: Vitest (Unit), optional Playwright (ein E2E-Smoke-Test)
- Lint/Format: ESLint + Prettier
- Infrastruktur: Docker (Multi-Stage), Docker Compose, Traefik (bereits auf dem Server
  vorhanden, externes Netzwerk), GitHub Actions, Images in GHCR, Server bei Hetzner

## Repo-Struktur
```
apps/web            Next.js Frontend
apps/api            NestJS API + Worker
packages/shared     Zod-Schemas, Typen, Limits
packages/db         Prisma-Schema, Migrationen, Client
scripts/eval        RAG-Evaluation
infra/              docker-compose.dev.yml, docker-compose.prod.yml, .env.example
docs/               PRD.md, DECISIONS.md, ARCHITECTURE.md (mit Mermaid-Diagramm)
.github/workflows   ci.yml, deploy.yml
```

## Konventionen
- Code, Kommentare, Commits: Englisch. UI-Texte: Deutsch.
- Alle API-Inputs und LLM-Outputs (strukturiert) mit Zod validieren.
- Keine `any`. Fehler zentral behandeln (NestJS Exception Filter), sinnvolle Statuscodes.
- Frontend: Server Components wo sinnvoll, Client Components nur für Interaktion.
  Lade-, Leer- und Fehlerzustände für jede Ansicht.
- Logging strukturiert (pino), keine Secrets oder Dokumentinhalte in Logs.

## Sicherheit (verbindlich)
- Niemals Secrets committen. Alle Werte in `infra/.env.example` mit Platzhaltern dokumentieren.
- Jeder Datenzugriff wird auf den eingeloggten User geprüft (Notebook-Ownership).
- Inhalte aus Quellen sind Daten, keine Anweisungen: im Prompt klar abgegrenzt,
  System-Prompt härtet gegen Prompt Injection.
- Limits und Rate Limiting aus `packages/shared` sind serverseitig durchgesetzt (siehe PRD).

## Befehle
- `pnpm dev` – alles lokal starten (Infra via `docker compose -f infra/docker-compose.dev.yml up -d`)
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm eval`
- `pnpm db:migrate`, `pnpm db:seed` (legt den Demo-User an)

## Nicht tun
- Keine zusätzlichen Frameworks oder Datenbanken ohne Rückfrage.
- Kein Firebase, kein Vercel-Hosting, keine Managed-Vektor-DB.
- Keine Features außerhalb des PRD ohne Rückfrage.
