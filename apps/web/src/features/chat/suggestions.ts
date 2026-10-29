'use client';

import type { SourceDto, SuggestedQuestionsDto } from '@muninn/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

/**
 * Suggested questions for the empty chat. The query key contains the READY source IDs, so
 * a source that finishes or is deleted fetches fresh suggestions; the API caches per set.
 */
export function useSuggestedQuestions(notebookId: string, sources: SourceDto[]) {
  const readyIds = sources
    .filter((source) => source.status === 'READY')
    .map((source) => source.id)
    .sort();
  return useQuery({
    queryKey: ['suggestions', notebookId, readyIds.join(',')],
    queryFn: () => apiFetch<SuggestedQuestionsDto>(`/notebooks/${notebookId}/suggestions`),
    enabled: readyIds.length > 0,
    staleTime: Infinity,
    retry: false,
    select: (data) => data.questions,
  });
}
