// RAG evaluation against a running Muninn instance (PRD §11): uploads the fixtures into a
// temporary notebook, asks every case through the chat API and scores retrieval, citations,
// refusals and prompt-injection resistance. Usage: `pnpm eval` (reads the root .env).
// One run asks 14 questions; the chat limit allows 30 per hour and user.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MuninnClient } from './client.ts';
import {
  locatePassage,
  scoreCase,
  summarize,
  type CaseResult,
  type EvalCase,
  type PassageLocation,
} from './metrics.ts';
import { markdownReport, printReport } from './report.ts';

interface Fixture {
  key: string;
  type: 'PDF' | 'TEXT';
  file: string;
  title?: string;
}

const root = path.resolve(import.meta.dirname, '..');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * Finds each expected passage in the extracted text of its source. Fails early when a case
 * does not match its fixture (typo or wrong page), so a bad case never looks like a miss.
 */
async function locateExpectedPassages(
  client: MuninnClient,
  cases: EvalCase[],
  sourceIds: ReadonlyMap<string, string>,
): Promise<Map<string, PassageLocation>> {
  const sources = new Map(
    await Promise.all(
      [...sourceIds].map(async ([key, id]) => [key, await client.getSource(id)] as const),
    ),
  );
  const locations = new Map<string, PassageLocation>();
  for (const { id, expect } of cases) {
    if (!expect) continue;
    const source = sources.get(expect.source);
    const location =
      source?.extractedText &&
      locatePassage({ ...source, extractedText: source.extractedText }, expect.text);
    if (!location) throw new Error(`Case ${id}: "${expect.text}" not found in ${expect.source}`);
    if (expect.page !== undefined && location.page !== expect.page) {
      throw new Error(`Case ${id}: passage is on page ${location.page}, expected ${expect.page}`);
    }
    locations.set(id, location);
  }
  return locations;
}

async function main(): Promise<void> {
  const baseUrl = process.env.EVAL_BASE_URL ?? 'http://localhost:3000';
  const { fixtures, cases } = JSON.parse(await readFile(path.join(root, 'cases.json'), 'utf8')) as {
    fixtures: Fixture[];
    cases: EvalCase[];
  };

  const client = new MuninnClient(baseUrl);
  await client.signIn(requireEnv('DEMO_USER_EMAIL'), requireEnv('DEMO_USER_PASSWORD'));
  const notebook = await client.createNotebook(`Eval ${new Date().toISOString().slice(0, 16)}`);
  console.log(`Notebook ${notebook.id} on ${baseUrl}`);

  try {
    const sourceIds = new Map<string, string>();
    for (const fixture of fixtures) {
      const data = await readFile(path.join(root, fixture.file));
      const source =
        fixture.type === 'PDF'
          ? await client.uploadPdf(notebook.id, path.basename(fixture.file), data)
          : await client.addText(notebook.id, fixture.title ?? fixture.key, data.toString('utf8'));
      sourceIds.set(fixture.key, source.id);
    }
    await client.waitUntilReady(notebook.id);
    const locations = await locateExpectedPassages(client, cases, sourceIds);
    console.log(`${sourceIds.size} sources ready, asking ${cases.length} questions…`);

    const results: CaseResult[] = [];
    for (const evalCase of cases) {
      // Every case stands alone: earlier answers would otherwise flow in as chat history.
      await client.clearChat(notebook.id);
      const answer = await client.ask(notebook.id, evalCase.question, [...sourceIds.values()]);
      const result = scoreCase(evalCase, answer, locations.get(evalCase.id) ?? null);
      results.push(result);
      console.log(`  ${result.id}: ${(result.durationMs / 1000).toFixed(1)} s`);
    }

    const summary = summarize(results);
    printReport(results, summary);
    const report = markdownReport(results, summary, {
      date: new Date().toISOString().slice(0, 10),
      baseUrl,
      chatModel: process.env.CHAT_MODEL ?? 'unbekannt',
    });
    await writeFile(path.join(root, 'results.md'), report);
    console.log('Wrote scripts/eval/results.md');
  } finally {
    await client.deleteNotebook(notebook.id);
  }
}

main().catch((error: unknown) => {
  console.error('Eval failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
