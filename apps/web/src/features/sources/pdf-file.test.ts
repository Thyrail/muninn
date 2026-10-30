import { describe, expect, it } from 'vitest';
import { pdfFileError } from './pdf-file';

const MB = 1024 * 1024;

describe('pdfFileError', () => {
  it('accepts a PDF within the size limit', () => {
    expect(pdfFileError({ name: 'raben.pdf', type: 'application/pdf', size: 2 * MB })).toBeNull();
  });

  it('accepts a .pdf name without a MIME type', () => {
    expect(pdfFileError({ name: 'Raben.PDF', type: '', size: MB })).toBeNull();
  });

  it('rejects other file types', () => {
    expect(pdfFileError({ name: 'notizen.docx', type: 'application/msword', size: MB })).toBe(
      'Es werden nur PDF-Dateien unterstützt.',
    );
  });

  it('rejects files over the limit', () => {
    expect(pdfFileError({ name: 'gross.pdf', type: 'application/pdf', size: 21 * MB })).toMatch(
      /zu groß/,
    );
  });
});
