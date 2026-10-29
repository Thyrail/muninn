import type { StudioOutput } from '@muninn/db';
import type { CitationDto, StudioOutputDto, StudioOutputType } from '@muninn/shared';

export function toStudioOutputDto(output: StudioOutput): StudioOutputDto {
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
    createdAt: output.createdAt.toISOString(),
  };
}
