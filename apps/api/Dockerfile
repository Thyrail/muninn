# syntax=docker/dockerfile:1.7
# API image. Also runs the worker (`node dist/worker.js`) and the one-shot migrate job.
# Build from the repo root: docker build -f apps/api/Dockerfile .

ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS base
# openssl lets Prisma pick the matching engine build (debian-openssl-3.0.x).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Reduce the monorepo to the API and its workspace dependencies.
FROM base AS pruner
WORKDIR /repo
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @muninn/api --docker

FROM base AS builder
WORKDIR /repo
# Postinstall output (Prisma engines) must match this image's OpenSSL, not a cached build.
ENV npm_config_side_effects_cache=false
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# turbo prune only copies workspace packages; shared root config is needed to compile.
COPY tsconfig.base.json ./
RUN pnpm turbo run build --filter=@muninn/api
# Self-contained production bundle (workspace packages copied in, dev deps dropped).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=@muninn/api deploy --prod --legacy /out
# Fail the build if the schema engine for migrations is missing (the runtime has no internet).
RUN ls /out/node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x

FROM ${NODE_IMAGE} AS runner
# openssl: Prisma schema engine (migrations). ffmpeg is added with the audio overview.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=builder --chown=node:node /out .
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
