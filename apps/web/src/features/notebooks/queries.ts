'use client';

import type { NotebookSummary } from '@muninn/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, jsonBody } from '@/lib/api-client';

export const notebookKeys = {
  all: ['notebooks'] as const,
  detail: (id: string) => ['notebooks', id] as const,
};

export function useNotebooks(initialData: NotebookSummary[]) {
  return useQuery({
    queryKey: notebookKeys.all,
    queryFn: () => apiFetch<NotebookSummary[]>('/notebooks'),
    initialData,
  });
}

export function useNotebook(id: string, initialData?: NotebookSummary) {
  return useQuery({
    queryKey: notebookKeys.detail(id),
    queryFn: () => apiFetch<NotebookSummary>(`/notebooks/${id}`),
    initialData,
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<NotebookSummary>('/notebooks', { method: 'POST', ...jsonBody({}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notebookKeys.all }),
  });
}

export function useRenameNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiFetch<NotebookSummary>(`/notebooks/${id}`, { method: 'PATCH', ...jsonBody({ title }) }),
    onSuccess: (notebook) => {
      queryClient.setQueryData(notebookKeys.detail(notebook.id), notebook);
      return queryClient.invalidateQueries({ queryKey: notebookKeys.all, exact: true });
    },
  });
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/notebooks/${id}`, { method: 'DELETE' }),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<NotebookSummary[]>(notebookKeys.all, (list) =>
        list?.filter((notebook) => notebook.id !== id),
      );
      queryClient.removeQueries({ queryKey: notebookKeys.detail(id) });
    },
  });
}
