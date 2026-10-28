import type { Metadata } from 'next';
import { BookOpenIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Notebooks' };

export default function NotebooksPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-heading text-3xl font-medium tracking-tight">Deine Notebooks</h1>
      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
        <BookOpenIcon className="size-8 text-muted-foreground" />
        <p className="mt-4 font-medium">Noch keine Notebooks</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Bald kannst du hier Notebooks anlegen, Quellen hochladen und Fragen dazu stellen.
        </p>
      </div>
    </div>
  );
}
