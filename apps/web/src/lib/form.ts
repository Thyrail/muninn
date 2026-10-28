import type { z } from 'zod';

/** Trimmed string value of a form field; files and missing fields become ''. */
export function formString(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

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
