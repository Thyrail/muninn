import { describe, expect, it } from 'vitest';
import { apiEnvSchema, parseEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://muninn:muninn@localhost:5432/muninn',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
};

describe('apiEnvSchema', () => {
  it('applies defaults', () => {
    const env = parseEnv(apiEnvSchema, valid);
    expect(env.PORT).toBe(4000);
    expect(env.ALLOW_SIGNUP).toBe(false);
    expect(env.EMBEDDING_DIM).toBe(768);
    expect(env.NODE_ENV).toBe('development');
  });

  it('parses boolean flags from strings', () => {
    expect(parseEnv(apiEnvSchema, { ...valid, ALLOW_SIGNUP: 'true' }).ALLOW_SIGNUP).toBe(true);
    expect(parseEnv(apiEnvSchema, { ...valid, ALLOW_SIGNUP: '0' }).ALLOW_SIGNUP).toBe(false);
  });

  it('rejects ambiguous boolean values', () => {
    expect(() => parseEnv(apiEnvSchema, { ...valid, ALLOW_SIGNUP: 'yes' })).toThrow(/ALLOW_SIGNUP/);
  });

  it('lists every invalid variable without leaking values', () => {
    const secret = 'too-short-secret';
    let message = '';
    try {
      parseEnv(apiEnvSchema, { BETTER_AUTH_SECRET: secret });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/DATABASE_URL/);
    expect(message).toMatch(/BETTER_AUTH_SECRET/);
    expect(message).toMatch(/BETTER_AUTH_URL/);
    expect(message).not.toContain(secret);
  });

  it('caps the embedding dimension at the HNSW limit', () => {
    expect(() => parseEnv(apiEnvSchema, { ...valid, EMBEDDING_DIM: '3072' })).toThrow(
      /EMBEDDING_DIM/,
    );
  });
});
