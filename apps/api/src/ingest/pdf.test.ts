import { describe, expect, it } from 'vitest';
import { normalizeWhitespace } from './extracted.js';
import { joinPages } from './pdf.js';

describe('joinPages', () => {
  it('records the start offset of every page', () => {
    const { text, pageOffsets } = joinPages(['Seite eins', 'Seite  zwei\n', 'Seite drei']);
    expect(text).toBe('Seite eins\n\nSeite zwei\n\nSeite drei');
    expect(pageOffsets).toEqual([0, 12, 24]);
    pageOffsets.forEach((offset, i) => {
      expect(text.slice(offset)).toMatch(new RegExp(`^Seite ${['eins', 'zwei', 'drei'][i]}`));
    });
  });

  it('keeps offsets for empty pages without adding separators', () => {
    const { text, pageOffsets } = joinPages(['Eins', '   ', 'Drei']);
    expect(text).toBe('Eins\n\nDrei');
    expect(pageOffsets).toEqual([0, 4, 6]);
  });

  it('returns empty text for a document without text', () => {
    expect(joinPages(['', ' \n ']).text).toBe('');
  });
});

describe('normalizeWhitespace', () => {
  it('collapses spaces, trims lines and limits blank lines', () => {
    expect(normalizeWhitespace('  a \t b \r\n\r\n\r\n\n  c  ')).toBe('a b\n\nc');
  });
});
