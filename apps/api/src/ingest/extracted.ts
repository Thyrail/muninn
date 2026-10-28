export interface ExtractedDocument {
  text: string;
  /** Start offset of each page in `text` (PDF only). */
  pageOffsets: number[];
  pageCount: number | null;
  /** Better title found during extraction (e.g. the article headline). */
  title?: string;
}

/** Collapses runs of spaces/tabs, trims lines and limits blank lines to one. */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
