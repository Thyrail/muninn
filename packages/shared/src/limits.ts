/**
 * Product limits (PRD §9). Enforced server-side; the web app only mirrors them for UX.
 */
export const LIMITS = {
  /** Max PDF upload size in bytes (20 MB). */
  maxFileSizeBytes: 20 * 1024 * 1024,
  allowedUploadMimeTypes: ['application/pdf'] as const,
  /** Max characters for pasted text sources. */
  maxTextChars: 200_000,
  maxSourcesPerNotebook: 10,
  maxNotebooksPerUser: 10,
  maxNotebookTitleLength: 120,

  /** URL sources: fetch timeout and max response size. */
  urlFetchTimeoutMs: 10_000,
  urlMaxResponseBytes: 5 * 1024 * 1024,

  /** Chat: max question length, retrieval candidates per method, chunks in the prompt. */
  chatMaxQuestionChars: 4000,
  chatRetrievalTopK: 20,
  chatContextChunks: 8,
  /** Previous messages sent to the model as conversation context. */
  chatHistoryMessages: 6,
} as const;

/** Fixed-window rate limits, enforced via Redis. */
export const RATE_LIMITS = {
  chatMessagesPerHour: 30,
  studioOutputsPerDay: 10,
  audioOverviewsPerDay: 3,
} as const;
