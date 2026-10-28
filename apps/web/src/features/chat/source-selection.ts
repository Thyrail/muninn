'use client';

import type { SourceDto } from '@muninn/shared';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Which sources the chat uses. Stored per notebook in localStorage as the list of
 * *deselected* IDs, so newly added sources are selected automatically (ADR-018).
 */
const storageKey = (notebookId: string) => `muninn:deselected-sources:${notebookId}`;
const listeners = new Set<() => void>();

function readRaw(notebookId: string): string {
  try {
    return window.localStorage.getItem(storageKey(notebookId)) ?? '[]';
  } catch {
    return '[]';
  }
}

function writeIds(notebookId: string, ids: string[]): void {
  try {
    window.localStorage.setItem(storageKey(notebookId), JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode): the selection just is not remembered.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function parseIds(raw: string): Set<string> {
  try {
    const value: unknown = JSON.parse(raw);
    return new Set(Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export interface SourceSelection {
  /** READY sources the chat uses. */
  selectedIds: string[];
  isSelected: (sourceId: string) => boolean;
  toggle: (sourceId: string, selected: boolean) => void;
  setAll: (selected: boolean) => void;
}

export function useSourceSelection(notebookId: string, sources: SourceDto[]): SourceSelection {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(notebookId),
    () => '[]',
  );
  const deselected = useMemo(() => parseIds(raw), [raw]);
  const readyIds = useMemo(
    () => sources.filter((source) => source.status === 'READY').map((source) => source.id),
    [sources],
  );
  const selectedIds = useMemo(
    () => readyIds.filter((id) => !deselected.has(id)),
    [readyIds, deselected],
  );

  const isSelected = useCallback((sourceId: string) => !deselected.has(sourceId), [deselected]);
  const toggle = useCallback(
    (sourceId: string, selected: boolean) => {
      const next = new Set(deselected);
      if (selected) next.delete(sourceId);
      else next.add(sourceId);
      // Forget IDs of sources that no longer exist.
      const known = new Set(sources.map((source) => source.id));
      writeIds(
        notebookId,
        [...next].filter((id) => known.has(id)),
      );
    },
    [deselected, notebookId, sources],
  );
  const setAll = useCallback(
    (selected: boolean) => writeIds(notebookId, selected ? [] : readyIds),
    [notebookId, readyIds],
  );

  return { selectedIds, isSelected, toggle, setAll };
}
