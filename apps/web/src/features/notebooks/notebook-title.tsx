'use client';

import { renameNotebookSchema } from '@muninn/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorText } from '@/lib/api-client';
import { useRenameNotebook } from './queries';

/** Notebook title that can be edited in place (click, type, Enter or blur to save). */
export function NotebookTitle({ id, title }: { id: string; title: string }) {
  const rename = useRenameNotebook();
  const [value, setValue] = useState(title);

  function save() {
    const parsed = renameNotebookSchema.safeParse({ title: value });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Ungültiger Titel.');
      setValue(title);
      return;
    }
    if (parsed.data.title === title) return;
    rename.mutate(
      { id, title: parsed.data.title },
      {
        onError: (error) => {
          toast.error(errorText(error));
          setValue(title);
        },
      },
    );
  }

  return (
    <input
      aria-label="Titel des Notebooks"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setValue(title);
          event.currentTarget.blur();
        }
      }}
      className="w-full min-w-0 truncate rounded-md bg-transparent px-1 py-0.5 font-heading text-2xl font-medium tracking-tight outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
