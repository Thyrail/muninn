import { describe, expect, it } from 'vitest';
import { DAY_MS, windowKey } from './rate-limit.service.js';

const daily = { name: 'llm-budget', windowMs: DAY_MS };

describe('windowKey', () => {
  it('keeps the same key within one UTC day', () => {
    const morning = Date.parse('2026-10-29T00:00:00Z');
    const night = Date.parse('2026-10-29T23:59:59Z');
    expect(windowKey(daily, 'global', morning)).toBe(windowKey(daily, 'global', night));
  });

  it('starts a new window at midnight UTC', () => {
    const before = Date.parse('2026-10-29T23:59:59Z');
    const after = Date.parse('2026-10-30T00:00:00Z');
    expect(windowKey(daily, 'global', before)).not.toBe(windowKey(daily, 'global', after));
  });

  it('separates rules and subjects', () => {
    const now = Date.parse('2026-10-29T12:00:00Z');
    expect(windowKey(daily, 'user-a', now)).not.toBe(windowKey(daily, 'user-b', now));
    expect(windowKey({ name: 'studio', windowMs: DAY_MS }, 'user-a', now)).not.toBe(
      windowKey(daily, 'user-a', now),
    );
  });
});
