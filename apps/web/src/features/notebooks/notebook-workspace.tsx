'use client';

import type { ChatMessageDto, SourceDto } from '@muninn/shared';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatPanel } from '../chat/chat-panel';
import { useSourceSelection } from '../chat/source-selection';
import { useSources } from '../sources/queries';
import type { TextRange } from '../sources/source-text';
import { SourceViewer } from '../sources/source-viewer';
import { SourceViewerContext, type SourceViewerActions } from '../sources/source-viewer-context';
import { SourcesPanel } from '../sources/sources-panel';
import { StudioOutputView } from '../studio/studio-output-view';
import { StudioPanel } from '../studio/studio-panel';
import { workspacePanelId, WorkspaceTabs, type WorkspaceTab } from './workspace-tabs';

/** Column templates from `lg`: an open source viewer or studio document widens its column. */
const GRID_COLUMNS = {
  none: 'lg:grid-cols-[18rem_minmax(0,1fr)_16rem]',
  source:
    'lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_16rem] xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)_16rem]',
  studio:
    'lg:grid-cols-[18rem_minmax(0,1fr)_minmax(0,24rem)] xl:grid-cols-[18rem_minmax(0,1fr)_minmax(0,30rem)]',
  both: 'lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,20rem)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_minmax(0,26rem)] 2xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)_minmax(0,32rem)]',
} as const;

/**
 * Sources, chat and studio of one notebook. Three columns from `lg`, tabs below; all panels
 * stay mounted on small screens so the chat keeps its state while another tab is shown.
 * The source viewer replaces the source list, an opened studio document the studio list.
 */
export function NotebookWorkspace({
  notebookId,
  isDemo,
  initialSources,
  initialMessages,
}: {
  notebookId: string;
  isDemo: boolean;
  initialSources: SourceDto[];
  initialMessages: ChatMessageDto[];
}) {
  const { data: sources } = useSources(notebookId, initialSources);
  const selection = useSourceSelection(notebookId, sources);
  const [tab, setTab] = useState<WorkspaceTab>(() =>
    initialSources.some((source) => source.status === 'READY') ? 'chat' : 'sources',
  );
  const [viewer, setViewer] = useState<{ sourceId: string; highlight?: TextRange } | null>(null);
  const [studioOutputId, setStudioOutputId] = useState<string | null>(null);
  const columns = viewer
    ? studioOutputId
      ? GRID_COLUMNS.both
      : GRID_COLUMNS.source
    : studioOutputId
      ? GRID_COLUMNS.studio
      : GRID_COLUMNS.none;

  const viewerActions = useMemo<SourceViewerActions>(
    () => ({
      openSource: (sourceId, highlight) => {
        // A fresh object, so clicking the same citation again scrolls to it again.
        setViewer({ sourceId, highlight: highlight && { ...highlight } });
        setTab('sources');
      },
    }),
    [],
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
    <SourceViewerContext value={viewerActions}>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className={cn('grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-5', columns)}>
          <div {...panelProps('sources')}>
            {viewer ? (
              <SourceViewer
                key={viewer.sourceId}
                sourceId={viewer.sourceId}
                highlight={viewer.highlight}
                onClose={() => setViewer(null)}
              />
            ) : (
              <SourcesPanel
                notebookId={notebookId}
                initialData={initialSources}
                selection={selection}
              />
            )}
          </div>
          <div {...panelProps('chat')}>
            <ChatPanel
              notebookId={notebookId}
              isDemo={isDemo}
              sources={sources}
              selectedIds={selection.selectedIds}
              initialMessages={initialMessages}
            />
          </div>
          <div {...panelProps('studio')}>
            {studioOutputId ? (
              <StudioOutputView
                notebookId={notebookId}
                outputId={studioOutputId}
                onClose={() => setStudioOutputId(null)}
              />
            ) : (
              <StudioPanel
                notebookId={notebookId}
                selectedIds={selection.selectedIds}
                onOpen={setStudioOutputId}
              />
            )}
          </div>
        </div>
        <WorkspaceTabs value={tab} onChange={setTab} className="lg:hidden" />
      </div>
    </SourceViewerContext>
  );
}
