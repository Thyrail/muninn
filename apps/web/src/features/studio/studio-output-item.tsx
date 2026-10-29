'use client';

import { isSourceProcessing, type StudioOutputDto } from '@muninn/shared';
import { ChevronRightIcon, LoaderCircleIcon, Trash2Icon } from 'lucide-react';
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
import { formatRelative } from '@/lib/format';
import { AudioOverview } from './audio-overview';
import { useDeleteStudioOutput } from './queries';
import { STUDIO_OUTPUT_META } from './studio-meta';

const PROGRESS_TEXT: Record<StudioOutputDto['type'], string> = {
  BRIEFING: 'Wird geschrieben…',
  FAQ: 'Wird geschrieben…',
  STUDY_GUIDE: 'Wird geschrieben…',
  AUDIO: 'Hugin & Munin nehmen auf… (ca. 1–2 Min.)',
};

export function StudioOutputItem({
  output,
  onOpen,
}: {
  output: StudioOutputDto;
  onOpen: () => void;
}) {
  const remove = useDeleteStudioOutput(output.notebookId);
  const { title, Icon } = STUDIO_OUTPUT_META[output.type];
  const processing = isSourceProcessing(output.status);
  const openable = output.status === 'READY' && output.type !== 'AUDIO';

  const heading = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {formatRelative(output.createdAt)}
        </span>
      </span>
    </>
  );

  return (
    <li className="rounded-lg border bg-card p-2.5">
      <div className="flex items-start gap-1">
        {openable ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`${title} öffnen`}
            className="-m-1 flex min-w-0 flex-1 items-start gap-2.5 rounded-md p-1 text-left hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {heading}
            <ChevronRightIcon
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-2.5">{heading}</div>
        )}
        {!output.protected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-0.5 -mr-1 shrink-0 text-muted-foreground"
                aria-label={`${title} löschen`}
              >
                <Trash2Icon />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{title} löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Das Ergebnis wird endgültig gelöscht. Du kannst es jederzeit neu erstellen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    remove.mutate(output.id, { onError: (error) => toast.error(errorText(error)) })
                  }
                >
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {processing && (
        <p
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <LoaderCircleIcon className="size-3 shrink-0 animate-spin" aria-hidden />
          {PROGRESS_TEXT[output.type]}
        </p>
      )}
      {output.status === 'FAILED' && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {output.error ?? 'Das Ergebnis konnte nicht erstellt werden.'}
        </p>
      )}
      {output.status === 'READY' && output.type === 'AUDIO' && <AudioOverview output={output} />}
    </li>
  );
}
