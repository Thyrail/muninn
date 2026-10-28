'use client';

import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorText } from '@/lib/api-client';
import { useCreateNotebook } from './queries';

export function CreateNotebookButton({ variant = 'default' }: { variant?: 'default' | 'outline' }) {
  const router = useRouter();
  const create = useCreateNotebook();

  return (
    <Button
      variant={variant}
      disabled={create.isPending}
      onClick={() =>
        create.mutate(undefined, {
          onSuccess: (notebook) => router.push(`/notebooks/${notebook.id}`),
          onError: (error) => toast.error(errorText(error)),
        })
      }
    >
      <PlusIcon />
      Neues Notebook
    </Button>
  );
}
