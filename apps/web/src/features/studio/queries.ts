'use client';

import {
  type CreateStudioOutputInput,
  isSourceProcessing,
  type StudioOutputDto,
} from '@muninn/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, jsonBody } from '@/lib/api-client';

const POLL_INTERVAL_MS = 3_000;

export const studioKeys = {
  list: (notebookId: string) => ['studio', notebookId] as const,
};

/** Polls while an output is being created; an audio overview takes one to two minutes. */
export function useStudioOutputs(notebookId: string) {
  return useQuery({
    queryKey: studioKeys.list(notebookId),
    queryFn: () => apiFetch<StudioOutputDto[]>(`/notebooks/${notebookId}/studio`),
    refetchInterval: (query) =>
      query.state.data?.some((output) => isSourceProcessing(output.status))
        ? POLL_INTERVAL_MS
        : false,
  });
}

export function useCreateStudioOutput(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudioOutputInput) =>
      apiFetch<StudioOutputDto>(`/notebooks/${notebookId}/studio`, {
        method: 'POST',
        ...jsonBody(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.list(notebookId) }),
  });
}

export function useDeleteStudioOutput(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (outputId: string) => apiFetch<void>(`/studio/${outputId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.list(notebookId) }),
  });
}
