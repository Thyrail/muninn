import { describe, expect, it } from 'vitest';
import { chunkText, pageAt, type ChunkOptions } from './chunker.js';

const small: ChunkOptions = { targetTokens: 25, overlapTokens: 5 }; // 100 chars, 20 overlap

function paragraph(index: number, length = 60): string {
  const words = `Absatz ${index} über Hugin und Munin, die Raben Odins. `;
  return (
    words
      .repeat(Math.ceil(length / words.length))
      .slice(0, length)
      .trim() + '.'
  );
}

describe('chunkText', () => {
  it('returns no chunks for empty or whitespace text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('  \n\n \t ')).toEqual([]);
  });

  it('keeps short text in a single trimmed chunk', () => {
    const chunks = chunkText('\n  Hugin denkt, Munin erinnert.  \n');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      index: 0,
      content: 'Hugin denkt, Munin erinnert.',
      charStart: 3,
      page: null,
    });
  });

  it('maps every chunk exactly onto the source text', () => {
    const text = Array.from({ length: 12 }, (_, i) => paragraph(i)).join('\n\n');
    for (const chunk of chunkText(text, [], small)) {
      expect(text.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.content);
    }
  });

  it('respects the target size and numbers chunks in order', () => {
    const text = Array.from({ length: 12 }, (_, i) => paragraph(i)).join('\n\n');
    const chunks = chunkText(text, [], small);
    expect(chunks.length).toBeGreaterThan(3);
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
      expect(chunk.content.length).toBeLessThanOrEqual(100);
      expect(chunk.tokenCount).toBe(Math.ceil(chunk.content.length / 4));
    });
  });

  it('overlaps consecutive chunks and covers the whole text', () => {
    // Sentences shorter than the overlap window, as with real text and 400-char overlaps.
    const paragraphs = Array.from({ length: 12 }, (_, i) => paragraph(i, 30));
    const text = paragraphs.join('\n\n');
    const chunks = chunkText(text, [], { targetTokens: 25, overlapTokens: 10 });

    for (let i = 1; i < chunks.length; i++) {
      const previous = chunks[i - 1]!;
      const current = chunks[i]!;
      expect(current.charStart).toBeGreaterThan(previous.charStart);
      expect(current.charStart).toBeLessThan(previous.charEnd);
    }
    expect(chunks[0]!.charStart).toBe(0);
    expect(chunks.at(-1)!.charEnd).toBe(text.length);
  });

  it('keeps the overlap close to the configured size', () => {
    const sentences = Array.from({ length: 40 }, (_, i) => `Satz ${i} über Raben.`);
    const text = sentences.join(' ');
    const chunks = chunkText(text, [], small);
    for (let i = 1; i < chunks.length; i++) {
      const overlap = chunks[i - 1]!.charEnd - chunks[i]!.charStart;
      expect(overlap).toBeGreaterThan(0);
      expect(overlap).toBeLessThanOrEqual(20);
    }
  });

  it('prefers ending a chunk at a paragraph break', () => {
    const first = 'Erster Absatz mit Inhalt. '.repeat(3).trim();
    const second = 'Zweiter Absatz folgt hier. '.repeat(3).trim();
    const text = `${first}\n\n${second}`;
    const [chunk] = chunkText(text, [], { targetTokens: 30, overlapTokens: 0 });
    expect(chunk!.content).toBe(first);
  });

  it('splits long paragraphs at sentence boundaries', () => {
    const sentences = Array.from({ length: 8 }, (_, i) => `Satz Nummer ${i} handelt von Raben.`);
    const text = sentences.join(' ');
    const chunks = chunkText(text, [], small);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content).toMatch(/^Satz Nummer \d/);
      expect(chunk.content).toMatch(/\.$/);
    }
  });

  it('hard-splits a single sentence that exceeds the target', () => {
    const text = 'Rabe '.repeat(80).trim();
    const chunks = chunkText(text, [], small);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((chunk) => chunk.content.length <= 100)).toBe(true);
    expect(chunks.at(-1)!.charEnd).toBe(text.length);
  });

  it('assigns the page of the chunk start', () => {
    const pages = [paragraph(1, 90), paragraph(2, 90), paragraph(3, 90)];
    const text = pages.join('\n\n');
    const offsets = [0, pages[0]!.length + 2, pages[0]!.length + pages[1]!.length + 4];
    const chunks = chunkText(text, offsets, small);
    expect(chunks.map((chunk) => chunk.page)).toEqual(
      chunks.map((chunk) => pageAt(chunk.charStart, offsets)),
    );
    expect(chunks[0]!.page).toBe(1);
    expect(chunks.at(-1)!.page).toBe(3);
  });
});

describe('pageAt', () => {
  const offsets = [0, 100, 250];

  it('finds the page containing an offset', () => {
    expect(pageAt(0, offsets)).toBe(1);
    expect(pageAt(99, offsets)).toBe(1);
    expect(pageAt(100, offsets)).toBe(2);
    expect(pageAt(249, offsets)).toBe(2);
    expect(pageAt(10_000, offsets)).toBe(3);
  });

  it('returns null without page information', () => {
    expect(pageAt(5, [])).toBeNull();
  });
});
