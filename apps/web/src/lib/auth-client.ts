import { createAuthClient } from 'better-auth/react';

/** Browser auth client. Same origin: Better Auth lives under /api/auth (Traefik or dev rewrite). */
export const authClient = createAuthClient();
