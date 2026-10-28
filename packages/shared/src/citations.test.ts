import { describe, expect, it } from 'vitest';
import { parseCitations, splitCitationSegments, stripCitations } from './citations.js';

describe('parseCitations', () => {
  it('keeps valid citations and lists them in order of appearance', () => {
    const result = parseCitations('Hugin denkt [2]. Munin erinnert [1].', 3);
    expect(result.text).toBe('Hugin denkt [2]. Munin erinnert [1].');
    expect(result.cited).toEqual([2, 1]);
  });

  it('removes out-of-range markers including the space before them', () => {
    const result = parseCitations('Odin hat zwei Raben [9]. Sie fliegen [0] täglich [2].', 3);
    expect(result.text).toBe('Odin hat zwei Raben. Sie fliegen täglich [2].');
    expect(result.cited).toEqual([2]);
  });

  it('filters invalid numbers inside multi-citations and normalizes the format', () => {
    const result = parseCitations('Belegt [2,9 ; 3].', 3);
    expect(result.text).toBe('Belegt [2, 3].');
    expect(result.cited).toEqual([2, 3]);
  });

  it('handles adjacent markers and duplicates', () => {
    const result = parseCitations('Satz [1][1][2, 2].', 2);
    expect(result.text).toBe('Satz [1][1][2].');
    expect(result.cited).toEqual([1, 2]);
  });

  it('leaves Markdown links, footnotes and non-numeric brackets alone', () => {
    const text = 'Siehe [Quelle](https://example.com), [^1], [a] und [1](https://x.de).';
    expect(parseCitations(text, 1)).toEqual({ text, cited: [] });
  });

  it('removes all markers when there are no sources', () => {
    expect(parseCitations('Nichts [1].', 0)).toEqual({ text: 'Nichts.', cited: [] });
  });

  it('keeps line breaks before a removed marker', () => {
    expect(parseCitations('Liste:\n[5] Punkt', 2).text).toBe('Liste:\n Punkt');
  });
});

describe('splitCitationSegments', () => {
  it('splits text and markers', () => {
    expect(splitCitationSegments('A [1]. B [2, 3]')).toEqual([
      { type: 'text', text: 'A ' },
      { type: 'citation', numbers: [1] },
      { type: 'text', text: '. B ' },
      { type: 'citation', numbers: [2, 3] },
    ]);
  });

  it('returns a single text segment without markers', () => {
    expect(splitCitationSegments('Kein Zitat')).toEqual([{ type: 'text', text: 'Kein Zitat' }]);
  });

  it('returns no segments for empty text', () => {
    expect(splitCitationSegments('')).toEqual([]);
  });
});

describe('stripCitations', () => {
  it('removes every marker', () => {
    expect(stripCitations('Raben [1] fliegen [2, 3].')).toBe('Raben fliegen.');
  });
});
