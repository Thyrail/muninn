import { describe, expect, it } from 'vitest';
import { LIMITS } from './limits.js';
import { createStudioOutputSchema, podcastScriptSchema } from './studio.js';

const id = '0199f3a0-0000-7000-8000-000000000001';

function turns(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    speaker: i % 2 === 0 ? 'HUGIN' : 'MUNIN',
    text: `Satz ${i}`,
  }));
}

describe('createStudioOutputSchema', () => {
  it('accepts a document type with selected sources', () => {
    expect(createStudioOutputSchema.parse({ type: 'FAQ', sourceIds: [id] })).toEqual({
      type: 'FAQ',
      sourceIds: [id],
    });
  });

  it('rejects mind maps and an empty selection', () => {
    expect(createStudioOutputSchema.safeParse({ type: 'MINDMAP', sourceIds: [id] }).success).toBe(
      false,
    );
    expect(createStudioOutputSchema.safeParse({ type: 'AUDIO', sourceIds: [] }).success).toBe(
      false,
    );
  });
});

describe('podcastScriptSchema', () => {
  it('accepts a dialogue within the turn limits', () => {
    expect(podcastScriptSchema.safeParse({ turns: turns(LIMITS.podcastMinTurns) }).success).toBe(
      true,
    );
  });

  it('rejects too short scripts, unknown speakers and overlong turns', () => {
    expect(podcastScriptSchema.safeParse({ turns: turns(3) }).success).toBe(false);
    const unknown = turns(LIMITS.podcastMinTurns).map((turn) => ({ ...turn, speaker: 'ODIN' }));
    expect(podcastScriptSchema.safeParse({ turns: unknown }).success).toBe(false);
    const long = turns(LIMITS.podcastMinTurns);
    long[0] = { speaker: 'HUGIN', text: 'x'.repeat(LIMITS.podcastMaxTurnChars + 1) };
    expect(podcastScriptSchema.safeParse({ turns: long }).success).toBe(false);
  });
});
