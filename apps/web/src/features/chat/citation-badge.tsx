'use client';

import type { CitationDto } from '@muninn/shared';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSourceViewer } from '../sources/source-viewer-context';

function location(citation: CitationDto): string {
  return citation.page === null
    ? citation.sourceTitle
    : `${citation.sourceTitle}, S. ${citation.page}`;
}

/** Numbered citation: hover shows a preview, click opens the passage in the source viewer. */
export function CitationBadge({ citation }: { citation: CitationDto }) {
  const viewer = useSourceViewer();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="mx-0.5 inline-flex h-4.5 min-w-4.5 translate-y-[-0.1em] items-center justify-center rounded-full bg-primary/25 px-1 align-middle text-[0.7rem] leading-none font-semibold text-foreground tabular-nums transition-colors hover:bg-primary/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Quelle ${citation.n}: ${location(citation)} öffnen`}
          onClick={() =>
            viewer?.openSource(citation.sourceId, {
              charStart: citation.charStart,
              charEnd: citation.charEnd,
            })
          }
        >
          {citation.n}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72">
        <p className="font-medium">{location(citation)}</p>
        <p className="mt-1 line-clamp-3 opacity-80">{citation.excerpt}</p>
      </TooltipContent>
    </Tooltip>
  );
}
