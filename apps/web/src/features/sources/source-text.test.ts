import { describe, expect, it } from 'vitest';
import { splitSourceText } from './source-text';

describe('splitSourceText', () => {
  it('returns one page without page offsets', () => {
    expect(splitSourceText('Hugin und Munin', [])).toEqual([
      { page: null, parts: [{ text: 'Hugin und Munin', highlighted: false }] },
    ]);
  });

  it('marks the highlighted range', () => {
    expect(splitSourceText('Hugin und Munin', [], { charStart: 6, charEnd: 9 })).toEqual([
      {
        page: null,
        parts: [
          { text: 'Hugin ', highlighted: false },
          { text: 'und', highlighted: true },
          { text: ' Munin', highlighted: false },
        ],
      },
    ]);
  });

  it('splits pages by offset and keeps leading text on page 1', () => {
    const pages = splitSourceText('xxAAABBB', [2, 5]);
    expect(pages.map((page) => [page.page, page.parts.map((part) => part.text).join('')])).toEqual([
      [1, 'xxAAA'],
      [2, 'BBB'],
    ]);
  });

  it('marks a range across a page break on both pages', () => {
    const pages = splitSourceText('AAABBB', [0, 3], { charStart: 2, charEnd: 4 });
    expect(pages).toEqual([
      {
        page: 1,
        parts: [
          { text: 'AA', highlighted: false },
          { text: 'A', highlighted: true },
        ],
      },
      {
        page: 2,
        parts: [
          { text: 'B', highlighted: true },
          { text: 'BB', highlighted: false },
        ],
      },
    ]);
  });

  it('clamps ranges outside the text and ignores empty ones', () => {
    expect(splitSourceText('abc', [], { charStart: 2, charEnd: 99 })[0]?.parts).toEqual([
      { text: 'ab', highlighted: false },
      { text: 'c', highlighted: true },
    ]);
    expect(splitSourceText('abc', [], { charStart: 5, charEnd: 9 })[0]?.parts).toEqual([
      { text: 'abc', highlighted: false },
    ]);
  });

  it('drops empty pages', () => {
    expect(splitSourceText('abc', [0, 3]).map((page) => page.page)).toEqual([1]);
  });
});
