import { describe, expect, it } from 'vitest';
import { toOrTsQuery } from './fts-query.js';

describe('toOrTsQuery', () => {
  it('joins meaningful words with OR and drops stopwords', () => {
    expect(toOrTsQuery('Wer ist Munin und was bedeutet sein Name?')).toBe(
      'munin | bedeutet | sein | name',
    );
  });

  it('keeps umlauts and digits, lowercases and deduplicates', () => {
    expect(toOrTsQuery('Größe 2026, größe!')).toBe('größe | 2026');
  });

  it('strips tsquery operators and quotes', () => {
    expect(toOrTsQuery(`odin & !hugin | 'munin' <-> (raben):*`)).toBe(
      'odin | hugin | munin | raben',
    );
  });

  it('returns null when nothing searchable remains', () => {
    expect(toOrTsQuery('Was ist das?')).toBeNull();
    expect(toOrTsQuery('?!')).toBeNull();
  });
});
