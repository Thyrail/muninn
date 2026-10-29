'use client';

import type { SourceDto } from '@muninn/shared';
import { ChevronDownIcon, RotateCwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { errorText } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useDeleteSource, useRetrySource } from './queries';
import { SOURCE_TYPE_ICONS, sourceMeta } from './source-meta';
import { SourceStatusBadge } from './source-status';
import { useSourceViewer } from './source-viewer-context';

export function SourceItem({
  source,
  selected,
  onSelectedChange,
}: {
  source: SourceDto;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const retry = useRetrySource(source.notebookId);
  const remove = useDeleteSource(source.notebookId);
  const viewer = useSourceViewer();
  const Icon = SOURCE_TYPE_ICONS[source.type];
  const meta = sourceMeta(source);

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        {source.status === 'READY' ? (
          <Checkbox
            className="mt-0.5"
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(checked === true)}
            aria-label={`${source.title} für den Chat verwenden`}
          />
        ) : (
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          {source.status === 'READY' && viewer ? (
            <button
              type="button"
              className="block max-w-full truncate rounded-sm text-left text-sm font-medium hover:underline hover:underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title={`${source.title} öffnen`}
              onClick={() => viewer.openSource(source.id)}
            >
              {source.title}
            </button>
          ) : (
            <p className="truncate text-sm font-medium" title={source.title}>
              {source.title}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {source.status === 'READY' && <Icon className="size-3.5 shrink-0" aria-hidden />}
            <SourceStatusBadge status={source.status} />
            {meta && <span className="truncate">{meta}</span>}
          </div>
        </div>
        {!source.protected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-1 size-8 shrink-0 text-muted-foreground"
                aria-label={`${source.title} entfernen`}
              >
                <Trash2Icon />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Quelle entfernen?</AlertDialogTitle>
                <AlertDialogDescription>
                  „{source.title}“ wird aus dem Notebook gelöscht und steht für Antworten nicht mehr
                  zur Verfügung.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    remove.mutate(source.id, { onError: (error) => toast.error(errorText(error)) })
                  }
                >
                  Entfernen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {source.status === 'FAILED' && (
        <div className="mt-3 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
          <p>{source.error ?? 'Die Quelle konnte nicht verarbeitet werden.'}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-7"
            disabled={retry.isPending}
            onClick={() =>
              retry.mutate(source.id, { onError: (error) => toast.error(errorText(error)) })
            }
          >
            <RotateCwIcon />
            Erneut versuchen
          </Button>
        </div>
      )}

      {source.status === 'READY' && source.summary && (
        <div className="mt-2">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronDownIcon
              className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
            />
            Zusammenfassung
          </button>
          {expanded && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{source.summary}</p>
          )}
        </div>
      )}
    </li>
  );
}
