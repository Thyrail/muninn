import { describe, expect, it } from 'vitest';
import { trustedOrigins } from './auth.factory.js';

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
