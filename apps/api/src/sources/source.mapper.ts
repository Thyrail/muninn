import type { Source } from '@muninn/db';
import type { SourceDetailDto, SourceDto } from '@muninn/shared';
import { isDemoProtected } from '../notebooks/ownership.js';

/** `demoSnapshotAt` of the source's notebook; null for normal notebooks. */
export function toSourceDto(source: Source, demoSnapshotAt: Date | null): SourceDto {
  return {
    id: source.id,
    notebookId: source.notebookId,
    type: source.type,
    title: source.title,
    originalUrl: source.originalUrl,
    status: source.status,
    error: source.error,
    summary: source.summary,
    pageCount: source.pageCount,
    protected: isDemoProtected(demoSnapshotAt, source.createdAt),
    createdAt: source.createdAt.toISOString(),
  };
}

export function toSourceDetailDto(source: Source, demoSnapshotAt: Date | null): SourceDetailDto {
  return {
    ...toSourceDto(source, demoSnapshotAt),
    extractedText: source.status === 'READY' ? source.extractedText : null,
    pageOffsets: source.pageOffsets,
  };
}

/** Derives a readable title from an uploaded file name ("bericht_2026.pdf" → "bericht_2026"). */
export function titleFromFileName(fileName: string, maxLength: number): string {
  const base = fileName.replace(/\.pdf$/i, '').trim();
  return (base || 'PDF-Dokument').slice(0, maxLength);
}

/** First non-empty line of a pasted text, shortened to a title. */
export function titleFromText(text: string, maxLength: number): string {
  const firstLine =
    text
      .split('\n')
      .find((line) => line.trim() !== '')
      ?.trim() ?? '';
  if (!firstLine) return 'Eingefügter Text';
  return firstLine.length > maxLength
    ? `${firstLine.slice(0, maxLength - 1).trimEnd()}…`
    : firstLine;
}
