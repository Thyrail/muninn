'use client';

import { renameNotebookSchema } from '@muninn/shared';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { errorText } from '@/lib/api-client';
import { useRenameNotebook } from './queries';

interface RenameNotebookDialogProps {
  notebook: { id: string; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameNotebookDialog({ notebook, open, onOpenChange }: RenameNotebookDialogProps) {
  const rename = useRenameNotebook();
  const [error, setError] = useState<string>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = renameNotebookSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    rename.mutate(
      { id: notebook.id, title: parsed.data.title },
      {
        onSuccess: () => onOpenChange(false),
        onError: (mutationError) => toast.error(errorText(mutationError)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setError(undefined);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Notebook umbenennen</DialogTitle>
          </DialogHeader>
          <FormField
            id="notebook-title"
            name="title"
            label="Titel"
            defaultValue={notebook.title}
            autoFocus
            error={error}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={rename.isPending}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
