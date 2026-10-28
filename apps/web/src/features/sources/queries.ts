'use client';

import { type CreateSourceInput, isSourceProcessing, type SourceDto } from '@muninn/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, jsonBody } from '@/lib/api-client';
import { notebookKeys } from '../notebooks/queries';

const POLL_INTERVAL_MS = 2_000;

export const sourceKeys = {
  list: (notebookId: string) => ['sources', notebookId] as const,
};

/** Polls every 2 s while any source is pending or processing (PRD §5). */
export function useSources(notebookId: string, initialData: SourceDto[]) {
  return useQuery({
    queryKey: sourceKeys.list(notebookId),
    queryFn: () => apiFetch<SourceDto[]>(`/notebooks/${notebookId}/sources`),
    initialData,
    refetchInterval: (query) =>
      query.state.data?.some((source) => isSourceProcessing(source.status))
        ? POLL_INTERVAL_MS
        : false,
  });
}

function useSourceMutation<TVariables>(
  notebookId: string,
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) }),
        queryClient.invalidateQueries({ queryKey: notebookKeys.all }),
      ]),
  });
}

export function useAddPdfSource(notebookId: string) {
  return useSourceMutation(notebookId, (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<SourceDto>(`/notebooks/${notebookId}/sources/file`, {
      method: 'POST',
      body: form,
    });
  });
}

export function useAddSource(notebookId: string) {
  return useSourceMutation(notebookId, (input: CreateSourceInput) =>
    apiFetch<SourceDto>(`/notebooks/${notebookId}/sources`, { method: 'POST', ...jsonBody(input) }),
  );
}

export function useRetrySource(notebookId: string) {
  return useSourceMutation(notebookId, (sourceId: string) =>
    apiFetch<SourceDto>(`/sources/${sourceId}/retry`, { method: 'POST' }),
  );
}

export function useDeleteSource(notebookId: string) {
  return useSourceMutation(notebookId, (sourceId: string) =>
    apiFetch<void>(`/sources/${sourceId}`, { method: 'DELETE' }),
  );
}
