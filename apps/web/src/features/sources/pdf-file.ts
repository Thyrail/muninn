import { LIMITS } from '@muninn/shared';

export const MAX_PDF_MB = LIMITS.maxFileSizeBytes / 1024 / 1024;

/** Client-side check before uploading; the API validates again (magic bytes, size). */
export function pdfFileError(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Es werden nur PDF-Dateien unterstützt.';
  }
  if (file.size > LIMITS.maxFileSizeBytes) {
    return `Die Datei ist zu groß. Erlaubt sind höchstens ${MAX_PDF_MB} MB.`;
  }
  return null;
}

/** True while a drag carries files (not text or links from the page). */
export function isFileDrag(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes('Files');
}
