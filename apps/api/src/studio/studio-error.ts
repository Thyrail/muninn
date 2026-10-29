/**
 * Studio failure with a message that is safe to show in the UI. Non-retryable errors (no
 * usable sources left) fail the job immediately.
 */
export class StudioError extends Error {
  readonly retryable: boolean;

  constructor(userMessage: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(userMessage, { cause: options.cause });
    this.name = 'StudioError';
    this.retryable = options.retryable ?? false;
  }
}

export const GENERIC_STUDIO_ERROR =
  'Das Ergebnis konnte nicht erstellt werden. Bitte versuche es später erneut.';

export function studioMessageFor(error: unknown): string {
  return error instanceof StudioError ? error.message : GENERIC_STUDIO_ERROR;
}
