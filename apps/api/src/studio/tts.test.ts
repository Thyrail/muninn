import type { PodcastTurn } from '@muninn/shared';
import { describe, expect, it } from 'vitest';
import {
  concatBytes,
  pcmDurationSec,
  segmentText,
  speechTurns,
  splitScript,
  usesStructuredSpeech,
} from './tts.js';

const turn = (speaker: PodcastTurn['speaker'], length: number): PodcastTurn => ({
  speaker,
  text: 'x'.repeat(length),
});

describe('splitScript', () => {
  it('keeps short scripts in one segment', () => {
    const turns = [turn('HUGIN', 10), turn('MUNIN', 10)];
    expect(splitScript(turns, 1000)).toEqual([turns]);
  });

  it('splits only at turn boundaries and keeps the order', () => {
    const turns = [turn('HUGIN', 40), turn('MUNIN', 40), turn('HUGIN', 40), turn('MUNIN', 40)];
    const segments = splitScript(turns, 110);
    expect(segments).toHaveLength(2);
    expect(segments.flat()).toEqual(turns);
  });

  it('puts an overlong turn into its own segment', () => {
    const turns = [turn('HUGIN', 10), turn('MUNIN', 500), turn('HUGIN', 10)];
    expect(splitScript(turns, 100).map((segment) => segment.length)).toEqual([1, 1, 1]);
  });
});

describe('segmentText', () => {
  it('writes one speaker line per turn after the style direction', () => {
    const text = segmentText([
      { speaker: 'HUGIN', text: 'Ich bin Hugin.' },
      { speaker: 'MUNIN', text: '…und ich bin Munin.' },
    ]);
    expect(text.split('\n').slice(1)).toEqual([
      'Hugin: Ich bin Hugin.',
      'Munin: …und ich bin Munin.',
    ]);
  });
});

describe('speech input', () => {
  it('uses structured turns from Gemini 3.8 on', () => {
    expect(usesStructuredSpeech('gemini-3.8-flash-tts')).toBe(true);
    expect(usesStructuredSpeech('gemini-3.1-flash-tts-preview')).toBe(false);
    expect(usesStructuredSpeech('gemini-2.5-pro-preview-tts')).toBe(false);
  });

  it('maps turns to speakers with a delivery style', () => {
    const [turn] = speechTurns([{ speaker: 'MUNIN', text: 'Genau.' }]);
    expect(turn?.text).toBe('Genau.');
    expect(turn?.speechMetadata.speaker).toBe('Munin');
    expect(turn?.speechMetadata.style).toMatch(/ruhig/i);
  });
});

describe('pcm helpers', () => {
  it('computes the duration of 16-bit mono PCM', () => {
    expect(pcmDurationSec(24_000 * 2 * 90, 24_000)).toBe(90);
  });

  it('concatenates byte arrays', () => {
    expect([...concatBytes([new Uint8Array([1, 2]), new Uint8Array([3])])]).toEqual([1, 2, 3]);
  });
});
