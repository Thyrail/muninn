'use client';

import { LIMITS, type SourceDto } from '@muninn/shared';
import { FileUpIcon, LibraryIcon } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { SourceSelection } from '../chat/source-selection';
import { AddSourceDialog } from './add-source-dialog';
import { isFileDrag } from './pdf-file';
import { useUploadPdf } from './pdf-upload';
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
  const { upload } = useUploadPdf(notebookId);
  const drop = useFileDrop((files) => {
    const free = LIMITS.maxSourcesPerNotebook - sources.length;
    if (free <= 0) {
      toast.error(`Ein Notebook kann höchstens ${LIMITS.maxSourcesPerNotebook} Quellen haben.`);
      return;
    }
    if (files.length > free) {
      toast.error(`Nur noch ${free} von ${files.length} Dateien passen in dieses Notebook.`);
    }
    for (const file of files.slice(0, free)) upload(file);
  });

  return (
    <section
      aria-labelledby="sources-heading"
      className="relative flex h-full min-h-0 flex-col"
      {...drop.handlers}
    >
      {drop.active && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/90 text-center"
        >
          <FileUpIcon className="size-7 text-primary" />
          <p className="mt-3 text-sm font-medium">PDF hier ablegen</p>
          <p className="mt-1 text-xs text-muted-foreground">Mehrere Dateien gehen auch</p>
        </div>
      )}
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
            Zieh ein PDF hierher oder füge eine Webseite oder einen Text hinzu.
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
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
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

/**
 * Accepts files dropped anywhere on the column. Events from the add-source dialog bubble here
 * through the React portal, so only targets inside this element's DOM count.
 */
function useFileDrop(onFiles: (files: File[]) => void) {
  const [active, setActive] = useState(false);
  // dragenter/dragleave fire for every child element; a depth counter avoids flicker.
  const depth = useRef(0);

  const fromHere = (event: DragEvent<HTMLElement>) =>
    isFileDrag(event.dataTransfer) && event.currentTarget.contains(event.target as Node);

  return {
    active,
    handlers: {
      onDragEnter: (event: DragEvent<HTMLElement>) => {
        if (!fromHere(event)) return;
        depth.current += 1;
        setActive(true);
      },
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!fromHere(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        if (!fromHere(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setActive(false);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!fromHere(event)) return;
        event.preventDefault();
        depth.current = 0;
        setActive(false);
        onFiles(Array.from(event.dataTransfer.files));
      },
    },
  };
}
