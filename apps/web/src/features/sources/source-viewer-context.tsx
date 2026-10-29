'use client';

import { createContext, useContext } from 'react';
import type { TextRange } from './source-text';

export interface SourceViewerActions {
  /** Shows a source in the viewer, optionally scrolled to and marking a passage. */
  openSource: (sourceId: string, highlight?: TextRange) => void;
}

export const SourceViewerContext = createContext<SourceViewerActions | null>(null);

export function useSourceViewer(): SourceViewerActions | null {
  return useContext(SourceViewerContext);
}
