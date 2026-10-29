import { describe, expect, it } from 'vitest';
import { formatDuration, parsePodcastScript } from './script';

const turns = Array.from({ length: 20 }, (_, i) => ({
  speaker: i % 2 === 0 ? 'HUGIN' : 'MUNIN',
  text: `Beitrag ${i}`,
}));

describe('parsePodcastScript', () => {
  it('parses a stored script', () => {
    expect(parsePodcastScript(JSON.stringify({ turns }))?.turns).toHaveLength(20);
  });

  it('returns null for missing or broken content', () => {
    expect(parsePodcastScript(null)).toBeNull();
    expect(parsePodcastScript('{kaputt')).toBeNull();
    expect(parsePodcastScript(JSON.stringify({ turns: [] }))).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(365)).toBe('6:05');
    expect(formatDuration(59.6)).toBe('1:00');
    expect(formatDuration(0)).toBe('0:00');
  });
});
