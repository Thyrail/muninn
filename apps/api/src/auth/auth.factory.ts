import type { PrismaClient } from '@muninn/db';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@muninn/shared';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { ApiEnv } from '../config/env.js';

export const AUTH_BASE_PATH = '/api/auth';

/** Origins allowed to call auth endpoints: the public domain plus the configured base URL. */
export function trustedOrigins(env: Pick<ApiEnv, 'DOMAIN' | 'BETTER_AUTH_URL' | 'NODE_ENV'>) {
  const scheme = env.NODE_ENV === 'production' ? 'https' : 'http';
  return [...new Set([`${scheme}://${env.DOMAIN}`, new URL(env.BETTER_AUTH_URL).origin])];
}

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
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
