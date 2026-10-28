import { z } from 'zod';
import { LIMITS } from './limits.js';

export const SOURCE_TYPES = ['PDF', 'URL', 'TEXT', 'YOUTUBE'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const PROCESSING_STATUSES = ['PENDING', 'PROCESSING', 'READY', 'FAILED'] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const MAX_SOURCE_TITLE_LENGTH = 200;

const httpUrl = z
  .url({ protocol: /^https?$/, error: 'Bitte gib eine gültige http(s)-Adresse ein.' })
  .max(2048, 'Die Adresse ist zu lang.');

export const createUrlSourceSchema = z.object({
  type: z.literal('URL'),
  url: httpUrl,
});

export const createTextSourceSchema = z.object({
  type: z.literal('TEXT'),
  title: z.string().trim().max(MAX_SOURCE_TITLE_LENGTH, 'Der Titel ist zu lang.').optional(),
  text: z
    .string()
    .trim()
    .min(1, 'Bitte füge einen Text ein.')
    .max(
      LIMITS.maxTextChars,
      `Der Text darf höchstens ${LIMITS.maxTextChars.toLocaleString('de-DE')} Zeichen lang sein.`,
    ),
});

/** JSON body of `POST /api/notebooks/:id/sources`. PDFs use the multipart endpoint instead. */
export const createSourceSchema = z.discriminatedUnion('type', [
  createUrlSourceSchema,
  createTextSourceSchema,
]);

export type CreateSourceInput = z.infer<typeof createSourceSchema>;

/** Source as listed in a notebook (without the extracted text). */
export interface SourceDto {
  id: string;
  notebookId: string;
  type: SourceType;
  title: string;
  originalUrl: string | null;
  status: ProcessingStatus;
  error: string | null;
  summary: string | null;
  pageCount: number | null;
  createdAt: string;
}

/** Source with its extracted text, for the source viewer. */
export interface SourceDetailDto extends SourceDto {
  extractedText: string | null;
  pageOffsets: number[];
}

export function isSourceProcessing(status: ProcessingStatus): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}

/** True if the buffer starts with the PDF magic bytes `%PDF-`. */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return signature.every((byte, index) => bytes[index] === byte);
}
