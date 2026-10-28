import { describe, expect, it } from 'vitest';
import { fuseRankings } from './rank-fusion.js';

describe('fuseRankings', () => {
  it('ranks IDs found by both methods above single hits', () => {
    const vector = ['a', 'b', 'c'];
    const text = ['c', 'd'];
    expect(fuseRankings([vector, text], 4)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('limits the result to topN', () => {
    expect(fuseRankings([['a', 'b', 'c']], 2)).toEqual(['a', 'b']);
  });

  it('keeps the order of first appearance on equal scores', () => {
    expect(fuseRankings([['a'], ['b']], 2)).toEqual(['a', 'b']);
  });

  it('handles empty rankings', () => {
    expect(fuseRankings([[], []], 8)).toEqual([]);
    expect(fuseRankings([[], ['x']], 8)).toEqual(['x']);
  });
});
