import { isIP } from 'node:net';
import { Readability } from '@mozilla/readability';
import { LIMITS } from '@muninn/shared';
import { parseHTML } from 'linkedom';
import { Agent, fetch } from 'undici';
import { type ExtractedDocument, normalizeWhitespace } from './extracted.js';
import { IngestError } from './ingest-error.js';
import { BlockedAddressError, guardedLookup, isPrivateAddress } from './network-guard.js';

const MAX_REDIRECTS = 3;
const MIN_TEXT_LENGTH = 200;
const USER_AGENT = 'MuninnBot/1.0 (+https://muninn.thyrail.de)';

const BLOCKED_MESSAGE = 'Diese Adresse kann aus Sicherheitsgründen nicht abgerufen werden.';
const UNREACHABLE_MESSAGE = 'Die Seite konnte nicht abgerufen werden. Ist die Adresse erreichbar?';

const dispatcher = new Agent({
  connect: { lookup: guardedLookup, timeout: LIMITS.urlFetchTimeoutMs },
});

function assertAllowedUrl(url: URL): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new IngestError(BLOCKED_MESSAGE);
  }
  // IP literals skip DNS lookup, so check them here.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isPrivateAddress(host)) throw new IngestError(BLOCKED_MESSAGE);
}

/** Fetches an HTML page with SSRF protection, manual redirects, timeout and size limit. */
export async function fetchHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
  let url = new URL(rawUrl);
  const signal = AbortSignal.timeout(LIMITS.urlFetchTimeoutMs);

  for (let redirects = 0; ; redirects++) {
    assertAllowedUrl(url);
    let response;
    try {
      response = await fetch(url, {
        dispatcher,
        redirect: 'manual',
        signal,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      });
    } catch (error) {
      const blocked = error instanceof Error && error.cause instanceof BlockedAddressError;
      throw new IngestError(blocked ? BLOCKED_MESSAGE : UNREACHABLE_MESSAGE, {
        retryable: !blocked,
        cause: error,
      });
    }

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      if (redirects >= MAX_REDIRECTS) throw new IngestError('Die Seite leitet zu oft weiter.');
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new IngestError(`Die Seite antwortet mit Fehler ${response.status}.`, {
        retryable: response.status >= 500,
      });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      await response.body?.cancel();
      throw new IngestError(
        'Unter dieser Adresse liegt keine Webseite. PDFs bitte als Datei hochladen.',
      );
    }
    return {
      html: await readLimited(response.body, LIMITS.urlMaxResponseBytes),
      finalUrl: url.href,
    };
  }
}

async function readLimited(body: AsyncIterable<Uint8Array> | null, maxBytes: number) {
  if (!body) return '';
  const decoder = new TextDecoder();
  let size = 0;
  let html = '';
  for await (const chunk of body) {
    size += chunk.byteLength;
    if (size > maxBytes) throw new IngestError('Die Seite ist zu groß.');
    html += decoder.decode(chunk, { stream: true });
  }
  return html + decoder.decode();
}

/** Extracts the readable article text of an HTML page (Mozilla Readability on linkedom). */
export function extractArticle(html: string, url: string): ExtractedDocument {
  const { document } = parseHTML(html);
  const article = new Readability(document, { charThreshold: 100 }).parse();
  const rawText = article?.textContent ?? document.body?.textContent ?? '';
  const text = normalizeWhitespace(rawText);
  if (text.length < MIN_TEXT_LENGTH) {
    throw new IngestError('Auf der Seite wurde kein lesbarer Text gefunden.');
  }
  const title = normalizeWhitespace(article?.title || document.title || new URL(url).hostname);
  return { text, pageOffsets: [], pageCount: null, title: title.slice(0, 200) };
}

export async function extractUrl(url: string): Promise<ExtractedDocument> {
  const { html, finalUrl } = await fetchHtml(url);
  return extractArticle(html, finalUrl);
}
