'use client';

import { LibraryIcon, MessagesSquareIcon, NotebookTextIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkspaceTab = 'sources' | 'chat' | 'studio';

const TABS = [
  { value: 'sources', label: 'Quellen', Icon: LibraryIcon },
  { value: 'chat', label: 'Chat', Icon: MessagesSquareIcon },
  { value: 'studio', label: 'Studio', Icon: NotebookTextIcon },
] as const;

export function workspacePanelId(tab: WorkspaceTab): string {
  return `workspace-panel-${tab}`;
}

/**
 * Switches between the workspace columns on small screens. The panels themselves stay
 * mounted and are only hidden, so a running chat stream survives a tab switch.
 */
export function WorkspaceTabs({
  value,
  onChange,
  className,
}: {
  value: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Bereiche des Notebooks"
      className={cn('grid grid-cols-3 gap-1 rounded-xl border bg-card/60 p-1', className)}
    >
      {TABS.map(({ value: tab, label, Icon }) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`workspace-tab-${tab}`}
          aria-selected={value === tab}
          aria-controls={workspacePanelId(tab)}
          onClick={() => onChange(tab)}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg py-2 text-sm text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            value === tab ? 'bg-secondary font-medium text-foreground' : 'hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
