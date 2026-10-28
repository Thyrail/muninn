import { ArrowLeftIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { NotebookTitle } from '@/features/notebooks/notebook-title';
import { NotebookWorkspace } from '@/features/notebooks/notebook-workspace';
import { getChatMessages, getNotebook, getSources } from '@/lib/api.server';

export async function generateMetadata({
  params,
}: PageProps<'/notebooks/[id]'>): Promise<Metadata> {
  const notebook = await getNotebook((await params).id);
  return { title: notebook?.title ?? 'Notebook' };
}

export default async function NotebookPage({ params }: PageProps<'/notebooks/[id]'>) {
  const { id } = await params;
  const notebook = await getNotebook(id);
  if (!notebook) notFound();
  const [sources, messages] = await Promise.all([getSources(id), getChatMessages(id)]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Zurück zur Übersicht">
          <Link href="/">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <NotebookTitle id={notebook.id} title={notebook.title} />
      </div>

      <NotebookWorkspace
        notebookId={notebook.id}
        initialSources={sources}
        initialMessages={messages}
      />
    </div>
  );
}
