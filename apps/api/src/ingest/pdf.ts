import { extractText } from 'unpdf';
import { type ExtractedDocument, normalizeWhitespace } from './extracted.js';
import { IngestError } from './ingest-error.js';

const PAGE_SEPARATOR = '\n\n';

/**
 * Joins per-page text into one document and records where each page starts, so chunks can be
 * attributed to pages. Empty pages keep their offset (pointing at the next content).
 */
export function joinPages(pages: string[]): Pick<ExtractedDocument, 'text' | 'pageOffsets'> {
  const pageOffsets: number[] = [];
  let text = '';
  for (const page of pages) {
    const content = normalizeWhitespace(page);
    if (text && content) text += PAGE_SEPARATOR;
    pageOffsets.push(text.length);
    text += content;
  }
  return { text, pageOffsets };
}

export async function extractPdf(bytes: Uint8Array): Promise<ExtractedDocument> {
  let pages: string[];
  let totalPages: number;
  try {
    ({ text: pages, totalPages } = await extractText(bytes, { mergePages: false }));
  } catch (error) {
    throw new IngestError(
      'Die PDF-Datei konnte nicht gelesen werden. Ist sie beschädigt oder passwortgeschützt?',
      { cause: error },
    );
  }

  const { text, pageOffsets } = joinPages(pages);
  if (!text) {
    throw new IngestError(
      'In dieser PDF wurde kein Text gefunden. Gescannte Dokumente ohne Texterkennung werden nicht unterstützt.',
    );
  }
  return { text, pageOffsets, pageCount: totalPages };
}
