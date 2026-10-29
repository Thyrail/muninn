import { z } from 'zod';
import type { CitationDto } from './chat.js';
import { LIMITS } from './limits.js';
import type { ProcessingStatus } from './sources.js';

/** Studio outputs offered in the UI (mind maps are out of scope, PRD §2). */
export const STUDIO_OUTPUT_TYPES = ['BRIEFING', 'FAQ', 'STUDY_GUIDE', 'AUDIO'] as const;
export type StudioOutputType = (typeof STUDIO_OUTPUT_TYPES)[number];

/** Document outputs are Markdown with citations; AUDIO is the two-host audio overview. */
export type StudioDocumentType = Exclude<StudioOutputType, 'AUDIO'>;

/** JSON body of `POST /api/notebooks/:id/studio`. Uses the source selection like the chat. */
export const createStudioOutputSchema = z.object({
  type: z.enum(STUDIO_OUTPUT_TYPES),
  sourceIds: z
    .array(z.uuid())
    .min(1, 'Wähle mindestens eine Quelle aus.')
    .max(LIMITS.maxSourcesPerNotebook),
});

export type CreateStudioOutputInput = z.infer<typeof createStudioOutputSchema>;

export interface StudioOutputDto {
  id: string;
  notebookId: string;
  type: StudioOutputType;
  status: ProcessingStatus;
  /** Markdown for documents, the JSON script for audio (see `podcastScriptSchema`). */
  content: string | null;
  citations: CitationDto[];
  durationSec: number | null;
  error: string | null;
  /** Part of the demo snapshot: cannot be deleted. */
  protected: boolean;
  createdAt: string;
}

export const PODCAST_SPEAKERS = ['HUGIN', 'MUNIN'] as const;
export type PodcastSpeaker = (typeof PODCAST_SPEAKERS)[number];

/** Dialogue script of the audio overview, generated as structured output and stored as JSON. */
export const podcastScriptSchema = z.object({
  turns: z
    .array(
      z.object({
        speaker: z.enum(PODCAST_SPEAKERS),
        text: z.string().trim().min(1).max(LIMITS.podcastMaxTurnChars),
      }),
    )
    .min(LIMITS.podcastMinTurns)
    .max(LIMITS.podcastMaxTurns),
});

export type PodcastScript = z.infer<typeof podcastScriptSchema>;
export type PodcastTurn = PodcastScript['turns'][number];
