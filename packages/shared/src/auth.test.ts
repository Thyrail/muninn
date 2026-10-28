import { describe, expect, it } from 'vitest';
import { registerSchema } from './auth.js';

describe('registerSchema', () => {
  it('trims names and accepts valid input', () => {
    const result = registerSchema.parse({
      name: '  Ada  ',
      email: 'ada@example.com',
      password: 'correct horse',
    });
    expect(result.name).toBe('Ada');
  });

  it('rejects short passwords with a German message', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'kurz',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/mindestens 8 Zeichen/);
  });
});
