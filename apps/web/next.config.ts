import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

const monorepoRoot = path.resolve(import.meta.dirname, '../..');

// Local dev keeps one .env at the repo root; in containers variables come from the runtime.
// forceReload: Next has already loaded (empty) env files from apps/web and caches the result.
loadEnvConfig(monorepoRoot, process.env.NODE_ENV !== 'production', undefined, true);

const apiInternalUrl = process.env.API_INTERNAL_URL;

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  poweredByHeader: false,
  transpilePackages: ['@muninn/shared'],
  experimental: {
    // Dev only: the /api rewrite passes uploads through Next (PDFs up to 20 MB). In production
    // Traefik routes /api straight to the API.
    proxyClientMaxBodySize: '25mb',
  },
  // In production Traefik routes /api to the API directly (same origin). Locally the Next dev
  // server forwards /api so the browser still only talks to one origin.
  rewrites() {
    if (process.env.NODE_ENV === 'production' || !apiInternalUrl) return Promise.resolve([]);
    return Promise.resolve([
      { source: '/api/:path*', destination: `${apiInternalUrl}/api/:path*` },
    ]);
  },
};

export default nextConfig;
