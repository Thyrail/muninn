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

  /** Studio: passages sent to the model, spread evenly over the selected sources. */
  studioContextChunks: 40,
  /** Audio overview script: number of turns and characters per turn. */
  podcastMinTurns: 20,
  podcastMaxTurns: 80,
  podcastMaxTurnChars: 600,
  /** Max characters of script per text-to-speech request. */
  podcastTtsSegmentChars: 3000,
} as const;

/** Fixed-window rate limits, enforced via Redis. */
export const RATE_LIMITS = {
  chatMessagesPerHour: 30,
  /** New or retried sources (embeddings + summary) per user. */
  sourcesPerHour: 30,
  studioOutputsPerDay: 10,
  audioOverviewsPerDay: 3,
} as const;
