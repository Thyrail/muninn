import { describe, expect, it } from 'vitest';
import { chatRequestSchema } from './chat.js';
import { LIMITS } from './limits.js';

const sourceId = '019a3b4c-5d6e-7f80-9a1b-2c3d4e5f6a7b';

describe('chatRequestSchema', () => {
  it('accepts a question with selected sources and trims it', () => {
    const result = chatRequestSchema.parse({ text: '  Wer ist Munin?  ', sourceIds: [sourceId] });
    expect(result.text).toBe('Wer ist Munin?');
  });

  it('rejects empty questions and missing sources', () => {
    expect(chatRequestSchema.safeParse({ text: '   ', sourceIds: [sourceId] }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ text: 'Frage', sourceIds: [] }).success).toBe(false);
  });

  it('rejects too long questions and invalid source IDs', () => {
    const long = 'x'.repeat(LIMITS.chatMaxQuestionChars + 1);
    expect(chatRequestSchema.safeParse({ text: long, sourceIds: [sourceId] }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ text: 'Frage', sourceIds: ['1'] }).success).toBe(false);
  });
});
