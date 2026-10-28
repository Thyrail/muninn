import { z } from 'zod';
import { LIMITS } from './limits.js';

/** JSON body of `POST /api/notebooks/:id/chat`. The history is loaded server-side. */
export const chatRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Bitte gib eine Frage ein.')
    .max(
      LIMITS.chatMaxQuestionChars,
      `Die Frage darf höchstens ${LIMITS.chatMaxQuestionChars.toLocaleString('de-DE')} Zeichen lang sein.`,
    ),
  sourceIds: z
    .array(z.uuid())
    .min(1, 'Wähle mindestens eine Quelle aus.')
    .max(LIMITS.maxSourcesPerNotebook),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export type ChatRole = 'USER' | 'ASSISTANT';

/** A numbered source passage the answer can cite as `[n]`. */
export interface CitationDto {
  n: number;
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  page: number | null;
  charStart: number;
  charEnd: number;
  /** Full chunk text, shown in the citation preview. */
  excerpt: string;
}

export interface ChatMessageDto {
  id: string;
  role: ChatRole;
  content: string;
  citations: CitationDto[];
  createdAt: string;
}

/**
 * Name of the UI message data part carrying the citations (`data-citations`). It is sent
 * with all candidates before the answer streams and replaced by the cited ones at the end.
 */
export const CITATIONS_DATA_PART = 'citations';

export interface CitationsData {
  citations: CitationDto[];
}
