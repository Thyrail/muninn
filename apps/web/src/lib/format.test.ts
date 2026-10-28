import { describe, expect, it } from 'vitest';
import { formatCount, formatRelative } from './format';

const now = new Date('2026-10-28T12:00:00Z');

describe('formatRelative', () => {
  it('formats recent and older dates in German', () => {
    expect(formatRelative('2026-10-28T11:59:50Z', now)).toBe('gerade eben');
    expect(formatRelative('2026-10-28T11:55:00Z', now)).toBe('vor 5 Minuten');
    expect(formatRelative('2026-10-27T12:00:00Z', now)).toBe('gestern');
    expect(formatRelative('2026-10-14T12:00:00Z', now)).toBe('vor 2 Wochen');
  });
});

describe('formatCount', () => {
  it('picks singular or plural', () => {
    expect(formatCount(1, 'Quelle', 'Quellen')).toBe('1 Quelle');
    expect(formatCount(0, 'Quelle', 'Quellen')).toBe('0 Quellen');
  });
});
