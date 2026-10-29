'use client';

import type { ChatMessageDto, SourceDto } from '@muninn/shared';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatPanel } from '../chat/chat-panel';
import { useSourceSelection } from '../chat/source-selection';
import { useSources } from '../sources/queries';
import { SourcesPanel } from '../sources/sources-panel';
import { StudioPanel } from '../studio/studio-panel';
import { workspacePanelId, WorkspaceTabs, type WorkspaceTab } from './workspace-tabs';

/**
 * Sources, chat and studio of one notebook. Three columns from `lg`, tabs below; all panels
 * stay mounted on small screens so the chat keeps its state while another tab is shown.
 */
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
  const [tab, setTab] = useState<WorkspaceTab>(() =>
    initialSources.some((source) => source.status === 'READY') ? 'chat' : 'sources',
  );

  function panelProps(panel: WorkspaceTab) {
    return {
      id: workspacePanelId(panel),
      role: 'tabpanel',
      'aria-labelledby': `workspace-tab-${panel}`,
      className: cn('min-h-0 min-w-0', tab !== panel && 'max-lg:hidden'),
    };
  }

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-5 lg:grid-cols-[18rem_minmax(0,1fr)_16rem]">
        <div {...panelProps('sources')}>
          <SourcesPanel
            notebookId={notebookId}
            initialData={initialSources}
            selection={selection}
          />
        </div>
        <div {...panelProps('chat')}>
          <ChatPanel
            notebookId={notebookId}
            sources={sources}
            selectedIds={selection.selectedIds}
            initialMessages={initialMessages}
          />
        </div>
        <div {...panelProps('studio')}>
          <StudioPanel />
        </div>
      </div>
      <WorkspaceTabs value={tab} onChange={setTab} className="lg:hidden" />
    </div>
  );
}
