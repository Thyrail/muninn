# syntax=docker/dockerfile:1.7
# Web image (Next.js standalone). Build from the repo root: docker build -f apps/web/Dockerfile .

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS pruner
WORKDIR /repo
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @muninn/web --docker

FROM base AS builder
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# turbo prune only copies workspace packages; shared root config is needed to compile.
COPY tsconfig.base.json ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm turbo run build --filter=@muninn/web

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/login || exit 1
CMD ["node", "apps/web/server.js"]
