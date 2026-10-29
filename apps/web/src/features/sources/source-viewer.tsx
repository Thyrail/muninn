'use client';

import { ArrowLeftIcon, ChevronDownIcon, ExternalLinkIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, errorText } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useSourceDetail } from './queries';
import { SOURCE_TYPE_ICONS, sourceMeta } from './source-meta';
import { splitSourceText, type TextRange } from './source-text';

/**
 * Full text of one source in place of the source list. A cited passage is marked and
 * scrolled into view; a new highlight on the same source scrolls again.
 */
export function SourceViewer({
  sourceId,
  highlight,
  onClose,
}: {
  sourceId: string;
  highlight?: TextRange;
  onClose: () => void;
}) {
  const { data: source, isPending, isError, error, refetch } = useSourceDetail(sourceId);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(
    () =>
      source?.extractedText
        ? splitSourceText(source.extractedText, source.pageOffsets, highlight)
        : [],
    [source, highlight],
  );

  useEffect(() => {
    const container = textRef.current;
    const mark = container?.querySelector('mark');
    if (!container || !mark) return;
    // Center short passages; long ones start at the top so their beginning stays visible.
    const fits = mark.getBoundingClientRect().height < container.clientHeight * 0.8;
    mark.scrollIntoView({ block: fits ? 'center' : 'start', behavior: 'smooth' });
  }, [pages]);

  const back = (
    <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={onClose}>
      <ArrowLeftIcon />
      Alle Quellen
    </Button>
  );

  if (isPending) {
    return (
      <section
        className="flex h-full min-h-0 flex-col"
        aria-busy="true"
        aria-label="Quelle wird geladen"
      >
        {back}
        <Skeleton className="mt-3 h-6 w-3/4" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    const gone = error instanceof ApiError && error.status === 404;
    return (
      <section className="flex h-full min-h-0 flex-col">
        {back}
        <div className="mt-4 rounded-lg border border-dashed p-4 text-sm">
          <p>{gone ? 'Diese Quelle gibt es nicht mehr.' : errorText(error)}</p>
          {!gone && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Erneut versuchen
            </Button>
          )}
        </div>
      </section>
    );
  }

  const Icon = SOURCE_TYPE_ICONS[source.type];
  const meta = sourceMeta(source);

  return (
    <section aria-labelledby="source-viewer-title" className="flex h-full min-h-0 flex-col">
      {back}
      <h2
        id="source-viewer-title"
        className="mt-2 font-heading text-lg leading-snug font-medium break-words"
      >
        {source.title}
      </h2>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {source.type === 'URL' && source.originalUrl ? (
          <a
            href={source.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
          >
            {meta}
            <ExternalLinkIcon className="size-3" aria-hidden />
          </a>
        ) : (
          meta && <span>{meta}</span>
        )}
      </div>

      {source.summary && (
        <div className="mt-3">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={summaryOpen}
            onClick={() => setSummaryOpen((open) => !open)}
          >
            <ChevronDownIcon
              className={cn('size-3.5 transition-transform', summaryOpen && 'rotate-180')}
            />
            Zusammenfassung
          </button>
          {summaryOpen && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{source.summary}</p>
          )}
        </div>
      )}

      <div
        ref={textRef}
        className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card px-4 py-3 text-sm leading-relaxed"
      >
        {pages.length === 0 ? (
          <p className="text-muted-foreground">Für diese Quelle liegt noch kein Text vor.</p>
        ) : (
          pages.map(({ page, parts }) => (
            <div key={page ?? 0} className="not-first:mt-5">
              {page !== null && (
                <p className="mb-1.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Seite {page}
                </p>
              )}
              <p className="wrap-anywhere whitespace-pre-wrap">
                {parts.map((part, index) =>
                  part.highlighted ? (
                    <mark
                      key={index}
                      className="rounded-sm bg-primary/30 box-decoration-clone px-0.5 text-foreground"
                    >
                      {part.text}
                    </mark>
                  ) : (
                    part.text
                  ),
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
