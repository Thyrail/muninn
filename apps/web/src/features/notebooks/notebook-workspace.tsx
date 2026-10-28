'use client';

import type { ChatMessageDto, SourceDto } from '@muninn/shared';
import { ChatPanel } from '../chat/chat-panel';
import { useSourceSelection } from '../chat/source-selection';
import { useSources } from '../sources/queries';
import { SourcesPanel } from '../sources/sources-panel';

/** Sources and chat of one notebook; they share the source selection. */
export function NotebookWorkspace({
  notebookId,
  initialSources,
  initialMessages,
}: {
  notebookId: string;
  initialSources: SourceDto[];
  initialMessages: ChatMessageDto[];
}) {
  const { data: sources } = useSources(notebookId, initialSources);
  const selection = useSourceSelection(notebookId, sources);

  return (
    <div className="mt-6 grid flex-1 gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <SourcesPanel notebookId={notebookId} initialData={initialSources} selection={selection} />
      <ChatPanel
        notebookId={notebookId}
        sources={sources}
        selectedIds={selection.selectedIds}
        initialMessages={initialMessages}
      />
    </div>
  );
}
