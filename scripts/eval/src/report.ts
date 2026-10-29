import type { CaseResult, Ratio, Summary } from './metrics.ts';

function percent({ passed, total }: Ratio): string {
  return total === 0 ? 'n/a' : `${Math.round((passed / total) * 100)} % (${passed}/${total})`;
}

function mark(value: boolean | null): string {
  if (value === null) return '';
  return value ? '✓' : '✗';
}

function rank(result: CaseResult): string {
  if (result.kind === 'unanswerable') return '';
  return result.rank === null ? '✗' : String(result.rank);
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

export function summaryRows(summary: Summary): Array<[string, string]> {
  return [
    ['Retrieval Hit@8', percent(summary.hitAt8)],
    ['Retrieval Hit@3', percent(summary.hitAt3)],
    ['Mean Reciprocal Rank', summary.mrr.toFixed(2)],
    ['Belegte Antworten', percent(summary.grounded)],
    ['Gültige Zitate', percent(summary.validCitations)],
    ['Korrekte Ablehnungen', percent(summary.refusals)],
    ['Injection widerstanden', percent(summary.injection)],
    ['Median Antwortzeit', seconds(summary.medianMs)],
  ];
}

export function printReport(results: CaseResult[], summary: Summary): void {
  console.table(
    results.map((result) => ({
      Fall: result.id,
      Rang: rank(result),
      Belegt: mark(result.grounded),
      Ablehnung: mark(result.refused),
      Injection: mark(result.resisted),
      Zitate: `${result.validMarkers}/${result.markers}`,
      Zeit: seconds(result.durationMs),
    })),
  );
  console.table(Object.fromEntries(summaryRows(summary)));
}

/** Answers are model output: render them as a block quote, outside the tables. */
function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

export function markdownReport(
  results: CaseResult[],
  summary: Summary,
  meta: { date: string; baseUrl: string; chatModel: string },
): string {
  return [
    '# Eval-Ergebnisse',
    '',
    `Lauf vom ${meta.date} gegen \`${meta.baseUrl}\` mit dem Chat-Modell \`${meta.chatModel}\`.`,
    'Drei Fixtures (ein zwölfseitiges PDF, zwei Texte) ergeben 9 Chunks; pro Frage sieht das Modell die besten 8.',
    'Erzeugt mit `pnpm eval`, Fälle und Fixtures liegen in `scripts/eval/`.',
    '',
    '| Metrik | Ergebnis |',
    '| --- | --- |',
    ...summaryRows(summary).map(([name, value]) => `| ${name} | ${value} |`),
    '',
    '| Fall | Frage | Rang | Belegt | Ablehnung | Injection | Zitate gültig | Zeit |',
    '| --- | --- | :-: | :-: | :-: | :-: | :-: | --: |',
    ...results.map(
      (result) =>
        `| ${result.id} | ${result.question} | ${rank(result)} | ${mark(result.grounded)} | ${mark(result.refused)} | ${mark(result.resisted)} | ${result.validMarkers}/${result.markers} | ${seconds(result.durationMs)} |`,
    ),
    '',
    '<details>',
    '<summary>Antworten</summary>',
    '',
    ...results.flatMap((result) => [
      `**${result.id}:** ${result.question}`,
      '',
      quote(result.answer),
      '',
    ]),
    '</details>',
    '',
  ].join('\n');
}
