'use client';

import { LIMITS, type SourceDto } from '@muninn/shared';
import { LibraryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddSourceDialog } from './add-source-dialog';
import { useSources } from './queries';
import { SourceItem } from './source-item';

export function SourcesPanel({
  notebookId,
  initialData,
}: {
  notebookId: string;
  initialData: SourceDto[];
}) {
  const { data: sources, isError, isFetching, refetch } = useSources(notebookId, initialData);
  const full = sources.length >= LIMITS.maxSourcesPerNotebook;

  return (
    <section aria-labelledby="sources-heading" className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="sources-heading" className="font-heading text-lg font-medium">
            Quellen
          </h2>
          <p className="text-xs text-muted-foreground">
            {sources.length} von {LIMITS.maxSourcesPerNotebook}
          </p>
        </div>
        <AddSourceDialog notebookId={notebookId} disabled={full} />
      </div>

      {isError && (
        <div className="mt-4 rounded-lg border border-dashed p-4 text-sm">
          <p>Die Quellen konnten nicht geladen werden.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Erneut versuchen
          </Button>
        </div>
      )}

      {!isError && sources.length === 0 && (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed px-4 py-10 text-center">
          <LibraryIcon className="size-7 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">Noch keine Quellen</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Lade ein PDF hoch oder füge eine Webseite oder einen Text hinzu.
          </p>
        </div>
      )}

      {sources.length > 0 && (
        <ul className="mt-4 space-y-2 overflow-y-auto pb-2">
          {sources.map((source) => (
            <SourceItem key={source.id} source={source} />
          ))}
        </ul>
      )}
      {isFetching && sources.length === 0 && <Skeleton className="mt-4 h-16" />}
    </section>
  );
}
