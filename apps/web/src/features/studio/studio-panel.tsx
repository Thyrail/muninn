'use client';

import { isSourceProcessing, STUDIO_OUTPUT_TYPES, type StudioOutputType } from '@muninn/shared';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { errorText } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useCreateStudioOutput, useStudioOutputs } from './queries';
import { StudioOutputItem } from './studio-output-item';
import { STUDIO_OUTPUT_META } from './studio-meta';

/**
 * Studio column: create tiles for each output type (using the chat's source selection) and
 * the list of created outputs. Documents open in place of the list, audio plays inline.
 */
export function StudioPanel({
  notebookId,
  selectedIds,
  onOpen,
}: {
  notebookId: string;
  selectedIds: string[];
  onOpen: (outputId: string) => void;
}) {
  const { data: outputs, isPending, isError, refetch } = useStudioOutputs(notebookId);
  const create = useCreateStudioOutput(notebookId);
  const noSelection = selectedIds.length === 0;

  function start(type: StudioOutputType) {
    create.mutate(
      { type, sourceIds: selectedIds },
      { onError: (error) => toast.error(errorText(error)) },
    );
  }

  return (
    <section aria-labelledby="studio-heading" className="flex h-full min-h-0 flex-col">
      <h2 id="studio-heading" className="font-heading text-lg font-medium">
        Studio
      </h2>
      <p className="text-xs text-muted-foreground">Aus den ausgewählten Quellen erstellt</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {STUDIO_OUTPUT_TYPES.map((type) => {
          const { title, description, Icon } = STUDIO_OUTPUT_META[type];
          const running =
            outputs?.some((output) => output.type === type && isSourceProcessing(output.status)) ??
            false;
          const starting = create.isPending && create.variables?.type === type;
          return (
            <button
              key={type}
              type="button"
              disabled={noSelection || running || starting}
              title={description}
              aria-label={`${title} erstellen: ${description}`}
              onClick={() => start(type)}
              className={cn(
                'flex min-h-16 flex-col items-start justify-between gap-2 rounded-lg border bg-card p-2.5 text-left text-sm font-medium transition-colors',
                'hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                'disabled:pointer-events-none disabled:opacity-60',
                type === 'AUDIO' && 'border-primary/30 bg-primary/5',
              )}
            >
              {running || starting ? (
                <LoaderCircleIcon className="size-4 animate-spin text-primary" aria-hidden />
              ) : (
                <Icon className="size-4 text-primary" aria-hidden />
              )}
              <span className="leading-tight">{title}</span>
            </button>
          );
        })}
      </div>
      {noSelection && (
        <p className="mt-2 text-xs text-muted-foreground">
          Wähle links mindestens eine fertige Quelle aus.
        </p>
      )}

      <h3 className="mt-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Ergebnisse
      </h3>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <div className="space-y-2" aria-busy="true" aria-label="Ergebnisse werden geladen">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-dashed p-3 text-sm">
            <p>Die Ergebnisse konnten nicht geladen werden.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
              Erneut versuchen
            </Button>
          </div>
        ) : outputs.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Noch nichts erstellt. Ein Klick auf eine Kachel erzeugt ein Briefing, eine FAQ, einen
            Lernleitfaden oder den Rabenbericht als Podcast.
          </p>
        ) : (
          <ul className="space-y-2">
            {outputs.map((output) => (
              <StudioOutputItem key={output.id} output={output} onOpen={() => onOpen(output.id)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
