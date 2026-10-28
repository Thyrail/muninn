'use client';

import { LIMITS, type SourceDto } from '@muninn/shared';
import { LibraryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { SourceSelection } from '../chat/source-selection';
import { AddSourceDialog } from './add-source-dialog';
import { useSources } from './queries';
import { SourceItem } from './source-item';

export function SourcesPanel({
  notebookId,
  initialData,
  selection,
}: {
  notebookId: string;
  initialData: SourceDto[];
  selection: SourceSelection;
}) {
  const { data: sources, isError, isFetching, refetch } = useSources(notebookId, initialData);
  const full = sources.length >= LIMITS.maxSourcesPerNotebook;
  const readyCount = sources.filter((source) => source.status === 'READY').length;
  const selectedCount = selection.selectedIds.length;
  const allSelected = readyCount > 0 && selectedCount === readyCount;

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

      {readyCount > 1 && (
        <label className="mt-4 flex items-center gap-3 px-3 text-sm text-muted-foreground">
          <Checkbox
            checked={allSelected ? true : selectedCount > 0 ? 'indeterminate' : false}
            onCheckedChange={(checked) => selection.setAll(checked === true)}
          />
          Alle Quellen auswählen
        </label>
      )}

      {sources.length > 0 && (
        <ul className="mt-3 space-y-2 overflow-y-auto pb-2">
          {sources.map((source) => (
            <SourceItem
              key={source.id}
              source={source}
              selected={selection.isSelected(source.id)}
              onSelectedChange={(selected) => selection.toggle(source.id, selected)}
            />
          ))}
        </ul>
      )}
      {isFetching && sources.length === 0 && <Skeleton className="mt-4 h-16" />}
    </section>
  );
}
