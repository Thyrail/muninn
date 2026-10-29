'use client';

import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelative } from '@/lib/format';
import { MessageContent } from '../chat/message-content';
import { useStudioOutputs } from './queries';
import { STUDIO_OUTPUT_META } from './studio-meta';

/** A finished studio document in place of the studio list, with clickable citations. */
export function StudioOutputView({
  notebookId,
  outputId,
  onClose,
}: {
  notebookId: string;
  outputId: string;
  onClose: () => void;
}) {
  const { data: outputs, isPending } = useStudioOutputs(notebookId);
  const output = outputs?.find((candidate) => candidate.id === outputId);

  const back = (
    <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={onClose}>
      <ArrowLeftIcon />
      Zurück zum Studio
    </Button>
  );

  if (isPending) {
    return (
      <section className="flex h-full min-h-0 flex-col" aria-busy="true">
        {back}
        <Skeleton className="mt-3 h-6 w-1/2" />
        <Skeleton className="mt-4 h-40 w-full" />
      </section>
    );
  }

  if (!output || output.status !== 'READY' || !output.content) {
    return (
      <section className="flex h-full min-h-0 flex-col">
        {back}
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm">
          Dieses Ergebnis gibt es nicht mehr.
        </p>
      </section>
    );
  }

  const { title, Icon } = STUDIO_OUTPUT_META[output.type];
  return (
    <section aria-labelledby="studio-output-title" className="flex h-full min-h-0 flex-col">
      {back}
      <div className="mt-2 flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        <h2 id="studio-output-title" className="font-heading text-lg font-medium">
          {title}
        </h2>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Erstellt {formatRelative(output.createdAt)}
      </p>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card px-4 py-3">
        <MessageContent text={output.content} citations={output.citations} streaming={false} />
      </div>
    </section>
  );
}
