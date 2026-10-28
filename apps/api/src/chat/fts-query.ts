/**
 * Frequent German and English function words. The `simple` text search config keeps them,
 * and in an OR query they would match nearly every chunk.
 */
const STOPWORDS = new Set(
  [
    'aber als am an auch auf aus bei bin bis das dass dem den der des die diese dieser du ein',
    'eine einem einen einer er es für gibt hat ich ihr im in ist mit nach nicht noch oder sich',
    'sie sind so über um und von vor was welche welcher wer wie wird wo zu zum zur',
    'a and are as at be by does for from how is it of on or that the this to what when where',
    'which who why with',
  ]
    .join(' ')
    .split(' '),
);

const MAX_TERMS = 24;

/**
 * Builds a `to_tsquery('simple', …)` expression that matches any of the meaningful words.
 *
 * `websearch_to_tsquery` combines words with AND, so a natural question rarely matches a
 * single chunk. OR plus `ts_rank_cd` ranks chunks by how many terms they contain (ADR-015).
 * Terms consist of letters and digits only, so the result is always valid tsquery syntax.
 * Returns null when nothing searchable is left.
 */
export function toOrTsQuery(text: string): string | null {
  const terms = new Set<string>();
  for (const [word] of text.toLowerCase().matchAll(/[\p{L}\p{N}]+/gu)) {
    if (word.length < 2 || STOPWORDS.has(word)) continue;
    terms.add(word);
    if (terms.size === MAX_TERMS) break;
  }
  return terms.size > 0 ? [...terms].join(' | ') : null;
}
