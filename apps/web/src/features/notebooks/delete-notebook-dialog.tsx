'use client';

import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { errorText } from '@/lib/api-client';
import { useDeleteNotebook } from './queries';

interface DeleteNotebookDialogProps {
  notebook: { id: string; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteNotebookDialog({
  notebook,
  open,
  onOpenChange,
  onDeleted,
}: DeleteNotebookDialogProps) {
  const remove = useDeleteNotebook();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>„{notebook.title}“ löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Das Notebook wird mit allen Quellen, Chats und Studio-Ergebnissen dauerhaft gelöscht.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              event.preventDefault();
              remove.mutate(notebook.id, {
                onSuccess: () => {
                  onOpenChange(false);
                  toast.success('Notebook gelöscht.');
                  onDeleted?.();
                },
                onError: (error) => toast.error(errorText(error)),
              });
            }}
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
