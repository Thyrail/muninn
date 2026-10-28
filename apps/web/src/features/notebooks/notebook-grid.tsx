'use client';

import type { NotebookSummary } from '@muninn/shared';
import { BookOpenIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateNotebookButton } from './create-notebook-button';
import { NotebookCard } from './notebook-card';
import { useNotebooks } from './queries';

export function NotebookGrid({ initialData }: { initialData: NotebookSummary[] }) {
  const { data: notebooks, isError, refetch } = useNotebooks(initialData);

  if (isError) {
    return (
      <div className="mt-8 rounded-xl border border-dashed px-6 py-12 text-center">
        <p className="font-medium">Die Notebooks konnten nicht geladen werden.</p>
        <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (notebooks.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
        <BookOpenIcon className="size-8 text-muted-foreground" />
        <p className="mt-4 font-medium">Noch keine Notebooks</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Ein Notebook sammelt Quellen zu einem Thema. Muninn beantwortet deine Fragen dann nur aus
          diesen Quellen.
        </p>
        <div className="mt-6">
          <CreateNotebookButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notebooks.map((notebook) => (
        <NotebookCard key={notebook.id} notebook={notebook} />
      ))}
    </div>
  );
}
