import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './auth-errors';

describe('authErrorMessage', () => {
  it('translates known Better Auth codes', () => {
    expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 })).toBe(
      'E-Mail oder Passwort ist falsch.',
    );
  });

  it('prefers the rate-limit message for 429', () => {
    expect(authErrorMessage({ code: 'SOMETHING', status: 429 })).toMatch(/Zu viele Versuche/);
  });

  it('falls back to a generic message', () => {
    expect(authErrorMessage(undefined)).toMatch(/nicht geklappt/);
    expect(authErrorMessage({ code: 'UNKNOWN_CODE' })).toMatch(/nicht geklappt/);
  });
});
