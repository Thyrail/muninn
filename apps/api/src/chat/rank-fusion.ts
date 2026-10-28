/** Damping constant from the original RRF paper; dampens the weight of top ranks. */
export const RRF_K = 60;

/**
 * Reciprocal Rank Fusion: merges ranked ID lists (best first) into one ranking.
 * Each list contributes `1 / (k + rank)` per ID, so IDs found by several methods rise.
 * Ties keep the order of first appearance, which makes the result deterministic.
 */
export function fuseRankings(rankings: string[][], topN: number, k = RRF_K): string[] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id]) => id);
}
