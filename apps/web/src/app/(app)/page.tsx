import type { Metadata } from 'next';
import { CreateNotebookButton } from '@/features/notebooks/create-notebook-button';
import { NotebookGrid } from '@/features/notebooks/notebook-grid';
import { getNotebooks } from '@/lib/api.server';

export const metadata: Metadata = { title: 'Notebooks' };

export default async function NotebooksPage() {
  const notebooks = await getNotebooks();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-medium tracking-tight">Deine Notebooks</h1>
        {notebooks.length > 0 && <CreateNotebookButton />}
      </div>
      <NotebookGrid initialData={notebooks} />
    </div>
  );
}
