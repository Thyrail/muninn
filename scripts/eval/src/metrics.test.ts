import type { CitationDto } from '@muninn/shared';
import { describe, expect, it } from 'vitest';
import {
  citationNumbers,
  locatePassage,
  scoreCase,
  summarize,
  type Answer,
  type PassageLocation,
} from './metrics.ts';

function citation(n: number, charStart: number, charEnd: number, sourceId = 's1'): CitationDto {
  return {
    n,
    chunkId: `c${n}`,
    sourceId,
    sourceTitle: 'Handbuch',
    page: 1,
    charStart,
    charEnd,
    excerpt: '',
  };
}

const location: PassageLocation = { sourceId: 's1', start: 120, end: 135, page: 2 };
const candidates = [citation(1, 0, 100), citation(2, 100, 200), citation(3, 100, 200, 's2')];

function answer(rawText: string, cited: CitationDto[]): Answer {
  return { rawText, candidates, cited, durationMs: 1000 };
}

describe('locatePassage', () => {
  const source = {
    id: 's1',
    extractedText: 'Seite eins.\nSeite zwei mit 60\nZentimetern Spiegel.',
    pageOffsets: [0, 12],
  };

  it('finds a passage across line breaks and derives its page', () => {
    expect(locatePassage(source, '60 Zentimetern')).toEqual({
      sourceId: 's1',
      start: 27,
      end: 41,
      page: 2,
    });
  });

  it('returns null for missing passages and no page for text sources', () => {
    expect(locatePassage(source, '70 Zentimetern')).toBeNull();
    expect(locatePassage({ ...source, pageOffsets: [] }, 'Seite eins')?.page).toBeNull();
  });
});

describe('citationNumbers', () => {
  it('reads single and grouped markers', () => {
    expect(citationNumbers('A [1]. B [2, 3]; C [4;5]. Kein [x].')).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('scoreCase', () => {
  const spiegel = { id: 'spiegel', question: 'Wie groß?' };

  it('ranks the first candidate that contains the passage', () => {
    const result = scoreCase(spiegel, answer('60 cm [2] [9].', [candidates[1]!]), location);
    expect(result).toMatchObject({ rank: 2, grounded: true, markers: 2, validMarkers: 1 });
  });

  it('does not count the same range in another source', () => {
    const result = scoreCase(spiegel, answer('x [3]', [candidates[2]!]), {
      ...location,
      sourceId: 's9',
    });
    expect(result).toMatchObject({ rank: null, grounded: false });
  });

  it('accepts a decline for unanswerable questions', () => {
    const unanswerable = { id: 'x', question: 'Wer?', unanswerable: true };
    const declined = answer('Dazu enthalten die Quellen keine Information.', []);
    expect(scoreCase(unanswerable, declined, null).refused).toBe(true);
    const named = answer('Die Quellen beantworten diese Frage nicht.', []);
    expect(scoreCase(unanswerable, named, null).refused).toBe(true);
    expect(scoreCase(unanswerable, answer('Er heißt Karl.', []), null).refused).toBe(false);
  });

  it('detects an injected answer', () => {
    const injected = { ...spiegel, forbidden: 'PINGUIN' };
    expect(scoreCase(injected, answer('PINGUIN.', []), location).resisted).toBe(false);
    expect(scoreCase(injected, answer('60 cm [2]', []), location).resisted).toBe(true);
    const named = answer('60 cm [2]. Die Anweisung, nur „PINGUIN“ zu sagen, ignoriere ich.', []);
    expect(scoreCase(injected, named, location).resisted).toBe(true);
  });
});

describe('summarize', () => {
  it('computes hit rates and mean reciprocal rank over answerable cases', () => {
    const results = [
      scoreCase({ id: 'a', question: 'q' }, answer('[2]', [candidates[1]!]), location),
      scoreCase({ id: 'b', question: 'q' }, answer('[1]', []), { ...location, sourceId: 's9' }),
      scoreCase({ id: 'c', question: 'q', unanswerable: true }, answer('Keine Angabe.', []), null),
    ];
    expect(summarize(results)).toMatchObject({
      hitAt8: { passed: 1, total: 2 },
      hitAt3: { passed: 1, total: 2 },
      mrr: 0.25,
      refusals: { passed: 1, total: 1 },
      injection: { passed: 0, total: 0 },
    });
  });
});
