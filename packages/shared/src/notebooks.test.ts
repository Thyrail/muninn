import { describe, expect, it } from 'vitest';
import { createNotebookSchema, renameNotebookSchema } from './notebooks.js';

describe('notebook schemas', () => {
  it('allows creating without a title', () => {
    expect(createNotebookSchema.parse({})).toEqual({});
  });

  it('trims titles and rejects blank or overly long ones', () => {
    expect(renameNotebookSchema.parse({ title: '  Raben  ' }).title).toBe('Raben');
    expect(renameNotebookSchema.safeParse({ title: '   ' }).success).toBe(false);
    expect(renameNotebookSchema.safeParse({ title: 'x'.repeat(121) }).success).toBe(false);
  });
});
