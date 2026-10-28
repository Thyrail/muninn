'use client';

import type { CitationDto } from '@muninn/shared';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function location(citation: CitationDto): string {
  return citation.page === null
    ? citation.sourceTitle
    : `${citation.sourceTitle}, S. ${citation.page}`;
}

/** Numbered citation: hover shows a preview, click opens the full passage. */
export function CitationBadge({ citation }: { citation: CitationDto }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="mx-0.5 inline-flex h-4.5 min-w-4.5 translate-y-[-0.1em] items-center justify-center rounded-full bg-primary/25 px-1 align-middle text-[0.7rem] leading-none font-semibold text-foreground tabular-nums transition-colors hover:bg-primary/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Quelle ${citation.n}: ${location(citation)}`}
            >
              {citation.n}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72">
          <p className="font-medium">{location(citation)}</p>
          <p className="mt-1 line-clamp-3 opacity-80">{citation.excerpt}</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)]" align="start">
        <p className="text-xs text-muted-foreground">Quelle {citation.n}</p>
        <p className="mt-0.5 text-sm font-medium">{location(citation)}</p>
        <p className="mt-3 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-line">
          {citation.excerpt}
        </p>
      </PopoverContent>
    </Popover>
  );
}
