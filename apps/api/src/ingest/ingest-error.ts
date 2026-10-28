/**
 * Failure with a message that is safe and helpful to show in the UI.
 * Non-retryable errors (broken PDF, blocked URL) fail the job immediately.
 */
export class IngestError extends Error {
  readonly retryable: boolean;

  constructor(userMessage: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(userMessage, { cause: options.cause });
    this.name = 'IngestError';
    this.retryable = options.retryable ?? false;
  }
}

export const GENERIC_INGEST_ERROR =
  'Die Quelle konnte nicht verarbeitet werden. Bitte versuche es später erneut.';

export function userMessageFor(error: unknown): string {
  return error instanceof IngestError ? error.message : GENERIC_INGEST_ERROR;
}
