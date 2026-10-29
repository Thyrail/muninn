import type { PrismaClient } from '@muninn/db';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@muninn/shared';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import type { ApiEnv } from '../config/env.js';

export const AUTH_BASE_PATH = '/api/auth';

/** Origins allowed to call auth endpoints: the public domain plus the configured base URL. */
export function trustedOrigins(env: Pick<ApiEnv, 'DOMAIN' | 'BETTER_AUTH_URL' | 'NODE_ENV'>) {
  const scheme = env.NODE_ENV === 'production' ? 'https' : 'http';
  return [...new Set([`${scheme}://${env.DOMAIN}`, new URL(env.BETTER_AUTH_URL).origin])];
}

/**
 * Account endpoints the shared demo account must not use: one visitor could otherwise change
 * the password, delete the account or sign everyone else out.
 */
export const DEMO_LOCKED_PATHS: ReadonlySet<string> = new Set([
  '/change-email',
  '/change-password',
  '/delete-user',
  '/update-user',
  '/revoke-session',
  '/revoke-sessions',
  '/revoke-other-sessions',
]);

export function isDemoLocked(
  path: string,
  email: string | undefined,
  demoEmail: string | undefined,
) {
  return (
    !!demoEmail &&
    !!email &&
    DEMO_LOCKED_PATHS.has(path) &&
    email.toLowerCase() === demoEmail.toLowerCase()
  );
}

/** Private networks the reverse proxy (Traefik in Docker) connects from. */
const TRUSTED_PROXIES = [
  '127.0.0.1/32',
  '::1/128',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
];

export function createAuth(prisma: PrismaClient, env: ApiEnv) {
  const isProduction = env.NODE_ENV === 'production';

  return betterAuth({
    appName: 'Muninn',
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(env),
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !env.ALLOW_SIGNUP,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!env.DEMO_USER_EMAIL || !DEMO_LOCKED_PATHS.has(ctx.path)) return;
        const session = await getSessionFromCtx(ctx);
        if (isDemoLocked(ctx.path, session?.user.email, env.DEMO_USER_EMAIL)) {
          throw new APIError('FORBIDDEN', { message: 'Im Demo-Account nicht möglich.' });
        }
      }),
    },
    advanced: {
      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
      },
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for'],
        // Walk the forwarded chain from the right and skip proxy hops: the leftmost entry is
        // client-controlled and must not choose the rate-limit bucket.
        trustedProxies: TRUSTED_PROXIES,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
