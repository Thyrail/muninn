import type { StudioOutput } from '@muninn/db';
import type { CitationDto, StudioOutputDto, StudioOutputType } from '@muninn/shared';
import { isDemoProtected } from '../notebooks/ownership.js';

/** `demoSnapshotAt` of the output's notebook; null for normal notebooks. */
export function toStudioOutputDto(
  output: StudioOutput,
  demoSnapshotAt: Date | null,
): StudioOutputDto {
  return {
    id: output.id,
    notebookId: output.notebookId,
    // MINDMAP exists in the database enum but is never created (out of scope).
    type: output.type as StudioOutputType,
    status: output.status,
    content: output.content,
    citations: output.citations as unknown as CitationDto[],
    durationSec: output.durationSec,
    error: output.error,
    protected: isDemoProtected(demoSnapshotAt, output.createdAt),
    createdAt: output.createdAt.toISOString(),
  };
}
