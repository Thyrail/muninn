/** Character range of a cited passage in a source's extracted text. */
export interface TextRange {
  charStart: number;
  charEnd: number;
}

export interface SourceTextPart {
  text: string;
  highlighted: boolean;
}

export interface SourceTextPage {
  /** 1-based page number, or null for sources without pages. */
  page: number | null;
  parts: SourceTextPart[];
}

/**
 * Splits extracted text into pages (by `pageOffsets`, PDF only) and marks the highlighted
 * range, which may span a page break. Offsets outside the text are clamped; text before the
 * first page offset belongs to page 1.
 */
export function splitSourceText(
  text: string,
  pageOffsets: readonly number[],
  highlight?: TextRange | null,
): SourceTextPage[] {
  const bounds =
    pageOffsets.length === 0
      ? [{ page: null, start: 0, end: text.length }]
      : pageOffsets.map((offset, index) => ({
          page: index + 1,
          start: index === 0 ? 0 : clamp(offset, text.length),
          end: clamp(pageOffsets[index + 1] ?? text.length, text.length),
        }));

  const markStart = highlight ? clamp(highlight.charStart, text.length) : 0;
  const markEnd = highlight ? clamp(highlight.charEnd, text.length) : 0;

  return bounds
    .filter(({ start, end }) => end > start)
    .map(({ page, start, end }) => {
      const from = Math.min(Math.max(markStart, start), end);
      const to = Math.max(Math.min(markEnd, end), from);
      const parts: SourceTextPart[] = [
        { text: text.slice(start, from), highlighted: false },
        { text: text.slice(from, to), highlighted: true },
        { text: text.slice(to, end), highlighted: false },
      ];
      return { page, parts: parts.filter((part) => part.text.length > 0) };
    });
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}
