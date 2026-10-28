/**
 * Inline citations of chat answers (PRD §6). The model cites numbered sources as `[1]`,
 * `[1, 3]` or `[1][2]`. These pure functions are shared by the API (cleaning before
 * persisting) and the web app (rendering badges), so both read markers identically.
 */

/**
 * A citation marker: brackets around one or more comma/semicolon separated numbers.
 * Not followed by `(` so Markdown links like `[1](https://…)` stay untouched.
 */
const MARKER = /\[\s*(\d+(?:\s*[,;]\s*\d+)*)\s*\](?!\()/g;

/** Marker including the horizontal whitespace before it, used when a marker is dropped. */
const MARKER_WITH_LEADING_SPACE = new RegExp(`[ \\t]*${MARKER.source}`, 'g');

export type CitationSegment =
  { type: 'text'; text: string } | { type: 'citation'; numbers: number[] };

export interface ParsedCitations {
  /** Text with invalid numbers removed; markers are normalized to `[1, 3]`. */
  text: string;
  /** Valid cited numbers, unique, in order of first appearance. */
  cited: number[];
}

function markerNumbers(inner: string): number[] {
  return [...new Set(inner.split(/[,;]/).map((part) => Number.parseInt(part.trim(), 10)))];
}

/**
 * Keeps only numbers between 1 and `sourceCount`. Markers without any valid number are
 * removed together with the whitespace before them.
 */
export function parseCitations(text: string, sourceCount: number): ParsedCitations {
  const cited: number[] = [];
  const cleaned = text.replace(MARKER_WITH_LEADING_SPACE, (match: string, inner: string) => {
    const valid = markerNumbers(inner).filter((n) => n >= 1 && n <= sourceCount);
    if (valid.length === 0) return '';
    for (const n of valid) if (!cited.includes(n)) cited.push(n);
    const leadingSpace = /^[ \t]*/.exec(match)?.[0] ?? '';
    return `${leadingSpace}[${valid.join(', ')}]`;
  });
  return { text: cleaned, cited };
}

/** Splits text into plain text and citation markers, for rendering badges. */
export function splitCitationSegments(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(MARKER)) {
    if (match.index > cursor)
      segments.push({ type: 'text', text: text.slice(cursor, match.index) });
    segments.push({ type: 'citation', numbers: markerNumbers(match[1]!) });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) segments.push({ type: 'text', text: text.slice(cursor) });
  return segments;
}

/** Removes all citation markers, e.g. before sending earlier answers back to the model. */
export function stripCitations(text: string): string {
  return text.replace(MARKER_WITH_LEADING_SPACE, '');
}
