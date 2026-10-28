'use client';

import type { NotebookSummary } from '@muninn/shared';
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCount, formatRelative } from '@/lib/format';
import { DeleteNotebookDialog } from './delete-notebook-dialog';
import { RenameNotebookDialog } from './rename-notebook-dialog';

export function NotebookCard({ notebook }: { notebook: NotebookSummary }) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="group relative flex min-h-36 flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
      <Link
        href={`/notebooks/${notebook.id}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`${notebook.title} öffnen`}
      />
      <div className="flex items-start justify-between gap-2">
        <h2 className="line-clamp-2 font-heading text-lg leading-snug font-medium">
          {notebook.title}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative -mt-1 -mr-2 shrink-0"
              aria-label={`Aktionen für ${notebook.title}`}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              <PencilIcon />
              Umbenennen
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
              <Trash2Icon />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="mt-auto pt-6 text-sm text-muted-foreground">
        {formatCount(notebook.sourceCount, 'Quelle', 'Quellen')} · bearbeitet{' '}
        {formatRelative(notebook.updatedAt)}
      </p>
      <RenameNotebookDialog notebook={notebook} open={renaming} onOpenChange={setRenaming} />
      <DeleteNotebookDialog notebook={notebook} open={deleting} onOpenChange={setDeleting} />
    </div>
  );
}
