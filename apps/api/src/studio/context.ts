/**
 * Chooses the passages a studio output is written from (ADR-023). The budget is shared
 * fairly between the selected sources, and each source contributes passages spread evenly
 * from its beginning to its end, so a briefing covers every source and every part of it.
 */
export function selectStudioChunks<T>(chunksBySource: T[][], budget: number): T[] {
  const quotas = fairQuotas(
    chunksBySource.map((chunks) => chunks.length),
    budget,
  );
  return chunksBySource.flatMap((chunks, index) => spreadEvenly(chunks, quotas[index] ?? 0));
}

/**
 * Splits `budget` between sources of the given sizes. Small sources take what they have and
 * leave the rest to larger ones; nobody gets more than its size.
 */
export function fairQuotas(sizes: number[], budget: number): number[] {
  const quotas = sizes.map(() => 0);
  const order = sizes.map((size, index) => ({ size, index })).sort((a, b) => a.size - b.size);
  let remaining = Math.max(0, budget);
  order.forEach(({ size, index }, position) => {
    const share = Math.floor(remaining / (order.length - position));
    const take = Math.min(size, share);
    quotas[index] = take;
    remaining -= take;
  });
  return quotas;
}

/** Picks `count` items in order, always including the first and (for count > 1) the last. */
export function spreadEvenly<T>(items: T[], count: number): T[] {
  if (count >= items.length) return [...items];
  if (count <= 0) return [];
  if (count === 1) return items.slice(0, 1);
  return Array.from(
    { length: count },
    (_, i) => items[Math.floor((i * (items.length - 1)) / (count - 1))]!,
  );
}
