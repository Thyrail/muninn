import {
  CITATIONS_DATA_PART,
  type CitationDto,
  type CitationsData,
  type NotebookSummary,
  type SourceDetailDto,
  type SourceDto,
} from '@muninn/shared';
import type { Answer } from './metrics.ts';

const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 2000;

/** Minimal client for the public API, authenticated like the browser (session cookie). */
export class MuninnClient {
  private cookie = '';
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async signIn(email: string, password: string): Promise<void> {
    const response = await this.request('/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.cookie = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
  }

  async createNotebook(title: string): Promise<NotebookSummary> {
    return this.json('/notebooks', { method: 'POST', body: JSON.stringify({ title }) });
  }

  async deleteNotebook(id: string): Promise<void> {
    await this.request(`/notebooks/${id}`, { method: 'DELETE' });
  }

  async uploadPdf(notebookId: string, fileName: string, data: Uint8Array): Promise<SourceDto> {
    const form = new FormData();
    form.append('file', new Blob([data], { type: 'application/pdf' }), fileName);
    return this.json(`/notebooks/${notebookId}/sources/file`, { method: 'POST', body: form });
  }

  async addText(notebookId: string, title: string, text: string): Promise<SourceDto> {
    return this.json(`/notebooks/${notebookId}/sources`, {
      method: 'POST',
      body: JSON.stringify({ type: 'TEXT', title, text }),
    });
  }

  async getSource(id: string): Promise<SourceDetailDto> {
    return this.json(`/sources/${id}`);
  }

  /** Waits until every source is READY; fails on FAILED or after the timeout. */
  async waitUntilReady(notebookId: string): Promise<SourceDto[]> {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    for (;;) {
      const sources = await this.json<SourceDto[]>(`/notebooks/${notebookId}/sources`);
      const failed = sources.find((source) => source.status === 'FAILED');
      if (failed) throw new Error(`Source "${failed.title}" failed: ${failed.error ?? ''}`);
      if (sources.every((source) => source.status === 'READY')) return sources;
      if (Date.now() > deadline) throw new Error('Sources did not become ready in time');
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }

  /** Removes the chat history, so the next question is answered without earlier turns. */
  async clearChat(notebookId: string): Promise<void> {
    await this.request(`/notebooks/${notebookId}/messages`, { method: 'DELETE' });
  }

  /** Asks a question and reads the UI message stream (server-sent events) to the end. */
  async ask(notebookId: string, text: string, sourceIds: string[]): Promise<Answer> {
    const startedAt = Date.now();
    const response = await this.request(`/notebooks/${notebookId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ text, sourceIds }),
    });
    if (!response.body) throw new Error('Chat response has no body');

    let rawText = '';
    let candidates: CitationDto[] | null = null;
    let cited: CitationDto[] = [];
    let buffer = '';
    const textStream = response.body.pipeThrough(new TextDecoderStream());
    for await (const part of textStream as AsyncIterable<string>) {
      buffer += part;
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        const data = event.replace(/^data: /, '').trim();
        if (!data || data === '[DONE]') continue;
        const chunk = JSON.parse(data) as {
          type: string;
          delta?: string;
          data?: CitationsData;
          errorText?: string;
        };
        if (chunk.type === 'text-delta') rawText += chunk.delta ?? '';
        if (chunk.type === `data-${CITATIONS_DATA_PART}` && chunk.data) {
          // The first part lists all candidates, the last one only the cited passages.
          candidates ??= chunk.data.citations;
          cited = chunk.data.citations;
        }
        if (chunk.type === 'error') throw new Error(`Chat error: ${chunk.errorText ?? ''}`);
      }
    }
    return { rawText, candidates: candidates ?? [], cited, durationMs: Date.now() - startedAt };
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.request(path, init);
    return (await response.json()) as T;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('origin', this.baseUrl);
    if (typeof init.body === 'string') headers.set('content-type', 'application/json');
    if (this.cookie) headers.set('cookie', this.cookie);
    const response = await fetch(`${this.baseUrl}/api${path}`, { ...init, headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${init.method ?? 'GET'} ${path} failed with ${response.status}: ${body}`);
    }
    return response;
  }
}
