import type { z } from 'zod';

export type FieldErrors = Partial<Record<string, string>>;

/** First error message per top-level field, for inline form errors. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}
