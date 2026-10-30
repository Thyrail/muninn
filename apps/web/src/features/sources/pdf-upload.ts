'use client';

import { toast } from 'sonner';
import { errorText } from '@/lib/api-client';
import { pdfFileError } from './pdf-file';
import { useAddPdfSource } from './queries';

/** Validates and uploads one PDF, reporting the outcome as a toast. */
export function useUploadPdf(notebookId: string) {
  const mutation = useAddPdfSource(notebookId);

  function upload(file: File, onSuccess?: () => void) {
    const error = pdfFileError(file);
    if (error) {
      toast.error(`${file.name}: ${error}`);
      return;
    }
    // mutateAsync: with several files in flight, `mutate` callbacks fire only for the last one.
    void mutation.mutateAsync(file).then(
      () => {
        toast.success(`${file.name} hochgeladen. Muninn liest es jetzt.`);
        onSuccess?.();
      },
      (mutationError: unknown) => toast.error(`${file.name}: ${errorText(mutationError)}`),
    );
  }

  return { upload, isPending: mutation.isPending };
}
