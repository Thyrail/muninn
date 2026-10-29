import { describe, expect, it } from 'vitest';
import { fairQuotas, selectStudioChunks, spreadEvenly } from './context.js';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('fairQuotas', () => {
  it('splits the budget evenly between large sources', () => {
    expect(fairQuotas([100, 100, 100, 100], 40)).toEqual([10, 10, 10, 10]);
  });

  it('gives the budget left over by small sources to larger ones', () => {
    expect(fairQuotas([3, 100, 50], 40)).toEqual([3, 19, 18]);
  });

  it('never exceeds the budget or a source size', () => {
    expect(fairQuotas([7, 2, 30, 1, 0], 13)).toEqual([5, 2, 5, 1, 0]);
    expect(fairQuotas([5, 5], 40)).toEqual([5, 5]);
  });
});

describe('spreadEvenly', () => {
  it('keeps the first and last item and spreads the rest', () => {
    expect(spreadEvenly(range(10), 4)).toEqual([0, 3, 6, 9]);
  });

  it('returns unique items in order', () => {
    const picked = spreadEvenly(range(11), 10);
    expect(new Set(picked).size).toBe(10);
    expect([...picked].sort((a, b) => a - b)).toEqual(picked);
  });

  it('handles small counts', () => {
    expect(spreadEvenly(range(5), 0)).toEqual([]);
    expect(spreadEvenly(range(5), 1)).toEqual([0]);
    expect(spreadEvenly(range(3), 8)).toEqual([0, 1, 2]);
  });
});

describe('selectStudioChunks', () => {
  it('covers every source, grouped by source', () => {
    const picked = selectStudioChunks([range(100).map((i) => `a${i}`), ['b0', 'b1']], 6);
    expect(picked).toEqual(['a0', 'a33', 'a66', 'a99', 'b0', 'b1']);
  });
});
