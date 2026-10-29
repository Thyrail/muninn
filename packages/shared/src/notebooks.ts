import { z } from 'zod';
import { LIMITS } from './limits.js';

export const DEFAULT_NOTEBOOK_TITLE = 'Unbenanntes Notebook';

const notebookTitle = z
  .string()
  .trim()
  .min(1, 'Bitte gib einen Titel ein.')
  .max(LIMITS.maxNotebookTitleLength, 'Der Titel ist zu lang.');

export const createNotebookSchema = z.object({
  title: notebookTitle.optional(),
});

export const renameNotebookSchema = z.object({
  title: notebookTitle,
});

export type CreateNotebookInput = z.infer<typeof createNotebookSchema>;
export type RenameNotebookInput = z.infer<typeof renameNotebookSchema>;

export interface NotebookSummary {
  id: string;
  title: string;
  sourceCount: number;
  /** Curated demo notebook: cannot be renamed or deleted. */
  protected: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotebookDetail = NotebookSummary;

export const SUGGESTED_QUESTION_COUNT = 3;

/** Structured LLM output for the suggested questions of a notebook. */
export const suggestedQuestionsSchema = z.object({
  questions: z.array(z.string().trim().min(3).max(200)).length(SUGGESTED_QUESTION_COUNT),
});

export interface SuggestedQuestionsDto {
  questions: string[];
}
