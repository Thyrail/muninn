import { ArrowLeftIcon, MessagesSquareIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { NotebookTitle } from '@/features/notebooks/notebook-title';
import { SourcesPanel } from '@/features/sources/sources-panel';
import { getNotebook, getSources } from '@/lib/api.server';

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
  const sources = await getSources(id);

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

      <div className="mt-6 grid flex-1 gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <SourcesPanel notebookId={notebook.id} initialData={sources} />
        <section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
          <MessagesSquareIcon className="size-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-medium">Fragen an deine Quellen</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Sobald deine Quellen bereit sind, kannst du hier Fragen stellen. Muninn antwortet nur
            aus diesen Quellen und belegt jede Aussage.
          </p>
        </section>
      </div>
    </div>
  );
}
