'use client';

import type { SourceDto, SourceType } from '@muninn/shared';
import {
  ChevronDownIcon,
  PlayIcon,
  FileTextIcon,
  GlobeIcon,
  RotateCwIcon,
  TextIcon,
  Trash2Icon,
} from 'lucide-react';
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
import { errorText } from '@/lib/api-client';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useDeleteSource, useRetrySource } from './queries';
import { SourceStatusBadge } from './source-status';

const TYPE_ICONS: Record<SourceType, typeof FileTextIcon> = {
  PDF: FileTextIcon,
  URL: GlobeIcon,
  TEXT: TextIcon,
  YOUTUBE: PlayIcon,
};

function sourceMeta(source: SourceDto): string | null {
  if (source.type === 'PDF' && source.pageCount) {
    return formatCount(source.pageCount, 'Seite', 'Seiten');
  }
  if (source.type === 'URL' && source.originalUrl) return new URL(source.originalUrl).hostname;
  return null;
}

export function SourceItem({ source }: { source: SourceDto }) {
  const [expanded, setExpanded] = useState(false);
  const retry = useRetrySource(source.notebookId);
  const remove = useDeleteSource(source.notebookId);
  const Icon = TYPE_ICONS[source.type];
  const meta = sourceMeta(source);

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={source.title}>
            {source.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <SourceStatusBadge status={source.status} />
            {meta && <span className="truncate">{meta}</span>}
          </div>
        </div>
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
