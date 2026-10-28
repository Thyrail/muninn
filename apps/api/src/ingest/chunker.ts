/**
 * Splits extracted text into overlapping chunks for retrieval (PRD §5.3).
 *
 * Pure function: chunk boundaries are character offsets into the original text, so
 * `content === text.slice(charStart, charEnd)` and the source viewer can highlight citations
 * exactly. Sizes are measured in characters with ~4 characters per token (see ADR-012).
 *
 * The text is cut into sentences (paragraph starts are remembered). Chunks are filled greedily
 * with whole sentences, preferably ending at a paragraph break, and consecutive chunks share
 * their last sentences as overlap.
 */

export interface ChunkOptions {
  /** Target chunk size in tokens. */
  targetTokens: number;
  /** Overlap between consecutive chunks in tokens. */
  overlapTokens: number;
}

export interface TextChunk {
  index: number;
  content: string;
  charStart: number;
  charEnd: number;
  /** 1-based page of `charStart`, or null when the source has no pages. */
  page: number | null;
  tokenCount: number;
}

interface Segment {
  start: number;
  end: number;
  /** True for the first sentence of a paragraph. */
  paragraphStart: boolean;
}

export const CHARS_PER_TOKEN = 4;
export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { targetTokens: 800, overlapTokens: 100 };

/** A chunk may end early at a paragraph break if it is at least this full. */
const PARAGRAPH_CUT_MIN_FILL = 0.6;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function chunkText(
  text: string,
  pageOffsets: number[] = [],
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): TextChunk[] {
  const maxChars = options.targetTokens * CHARS_PER_TOKEN;
  const overlapChars = options.overlapTokens * CHARS_PER_TOKEN;
  const segments = splitIntoSegments(text, maxChars);
  const chunks: TextChunk[] = [];

  let first = 0;
  while (first < segments.length) {
    const start = segments[first]!.start;
    let last = first;
    while (last + 1 < segments.length && segments[last + 1]!.end - start <= maxChars) last++;

    // Prefer ending at a paragraph break if the chunk is already reasonably full.
    if (last + 1 < segments.length && !segments[last + 1]!.paragraphStart) {
      for (let k = last - 1; k > first; k--) {
        if (segments[k]!.end - start < maxChars * PARAGRAPH_CUT_MIN_FILL) break;
        if (segments[k + 1]!.paragraphStart) {
          last = k;
          break;
        }
      }
    }

    const charEnd = segments[last]!.end;
    const content = text.slice(start, charEnd);
    chunks.push({
      index: chunks.length,
      content,
      charStart: start,
      charEnd,
      page: pageAt(start, pageOffsets),
      tokenCount: estimateTokens(content),
    });
    if (last === segments.length - 1) break;

    // Overlap: step back over trailing sentences that fit into the overlap window.
    // `next - 1 > first` guarantees forward progress.
    let next = last + 1;
    while (next - 1 > first && charEnd - segments[next - 1]!.start <= overlapChars) next--;
    first = next;
  }

  return chunks;
}

/** 1-based page containing `offset`, given the start offset of every page. */
export function pageAt(offset: number, pageOffsets: number[]): number | null {
  if (pageOffsets.length === 0) return null;
  let low = 0;
  let high = pageOffsets.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (pageOffsets[mid]! <= offset) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

/**
 * Sentences in document order. Sentences longer than `maxChars` are split at whitespace.
 * Headings and list items without terminal punctuation stay separate because they sit on
 * their own line, so line breaks also count as sentence boundaries.
 */
function splitIntoSegments(text: string, maxChars: number): Segment[] {
  const segments: Segment[] = [];
  for (const paragraph of trimmedSpans(text, /\n\s*\n/g, 0, text.length)) {
    const sentences = trimmedSpans(text, /(?<=[.!?…:])\s+|\n/g, paragraph.start, paragraph.end);
    sentences.forEach((sentence, i) => {
      const pieces =
        sentence.end - sentence.start <= maxChars
          ? [sentence]
          : hardSplit(text, sentence, maxChars);
      pieces.forEach((piece, j) => segments.push({ ...piece, paragraphStart: i === 0 && j === 0 }));
    });
  }
  return segments;
}

interface Span {
  start: number;
  end: number;
}

/** Splits [start, end) at `separator` matches and drops surrounding whitespace and empty pieces. */
function trimmedSpans(text: string, separator: RegExp, start: number, end: number): Span[] {
  const spans: Span[] = [];
  const slice = text.slice(start, end);
  let cursor = 0;
  for (const match of slice.matchAll(separator)) {
    pushTrimmed(text, start + cursor, start + match.index, spans);
    cursor = match.index + match[0].length;
  }
  pushTrimmed(text, start + cursor, end, spans);
  return spans;
}

function pushTrimmed(text: string, start: number, end: number, out: Span[]): void {
  while (start < end && /\s/.test(text[start]!)) start++;
  while (end > start && /\s/.test(text[end - 1]!)) end--;
  if (end > start) out.push({ start, end });
}

function hardSplit(text: string, span: Span, maxChars: number): Span[] {
  const pieces: Span[] = [];
  let start = span.start;
  while (span.end - start > maxChars) {
    let cut = text.lastIndexOf(' ', start + maxChars);
    if (cut <= start) cut = start + maxChars;
    pushTrimmed(text, start, cut, pieces);
    start = cut;
  }
  pushTrimmed(text, start, span.end, pieces);
  return pieces;
}
