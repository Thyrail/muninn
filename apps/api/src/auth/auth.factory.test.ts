import { describe, expect, it } from 'vitest';
import { isDemoLocked, trustedOrigins } from './auth.factory.js';

describe('trustedOrigins', () => {
  it('uses https for the public domain in production', () => {
    expect(
      trustedOrigins({
        NODE_ENV: 'production',
        DOMAIN: 'muninn.thyrail.de',
        BETTER_AUTH_URL: 'https://muninn.thyrail.de',
      }),
    ).toEqual(['https://muninn.thyrail.de']);
  });

  it('allows the local web origin in development', () => {
    expect(
      trustedOrigins({
        NODE_ENV: 'development',
        DOMAIN: 'localhost:3000',
        BETTER_AUTH_URL: 'http://localhost:3000/',
      }),
    ).toEqual(['http://localhost:3000']);
  });
});

describe('isDemoLocked', () => {
  const demo = 'demo@muninn.app';

  it('blocks account changes for the demo user, case-insensitively', () => {
    expect(isDemoLocked('/change-password', 'Demo@Muninn.app', demo)).toBe(true);
    expect(isDemoLocked('/revoke-sessions', demo, demo)).toBe(true);
    expect(isDemoLocked('/delete-user', demo, demo)).toBe(true);
  });

  it('allows normal use and other users', () => {
    expect(isDemoLocked('/sign-out', demo, demo)).toBe(false);
    expect(isDemoLocked('/get-session', demo, demo)).toBe(false);
    expect(isDemoLocked('/change-password', 'someone@example.com', demo)).toBe(false);
  });

  it('does nothing without a session or demo account', () => {
    expect(isDemoLocked('/change-password', undefined, demo)).toBe(false);
    expect(isDemoLocked('/change-password', demo, undefined)).toBe(false);
  });
});
