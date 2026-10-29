import { describe, expect, it } from 'vitest';
import { IngestError } from './ingest-error.js';
import { extractArticle, fetchHtml } from './url.js';

const article = `<!doctype html><html><head><title>Raben | Lexikon</title></head><body>
<nav><a href="/">Start</a> <a href="/impressum">Impressum</a></nav>
<article><h1>Hugin und Munin</h1>
<p>${'Hugin und Munin sind die beiden Raben des Gottes Odin in der nordischen Mythologie. '.repeat(4)}</p>
<p>${'Jeden Morgen fliegen sie aus und berichten Odin am Abend, was sie gesehen haben. '.repeat(4)}</p>
</article><footer>Cookie-Hinweis</footer></body></html>`;

describe('extractArticle', () => {
  it('extracts the main text and title', () => {
    const result = extractArticle(article, 'https://example.com/raben');
    expect(result.text).toContain('Hugin und Munin sind die beiden Raben');
    expect(result.text).not.toContain('Impressum');
    expect(result.title).toMatch(/Hugin und Munin|Raben/);
    expect(result.pageOffsets).toEqual([]);
  });

  it('rejects pages without readable text', () => {
    expect(() => extractArticle('<html><body><p>Kurz.</p></body></html>', 'https://x.de')).toThrow(
      IngestError,
    );
  });
});

describe('fetchHtml', () => {
  it.each([
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5:8080/',
    // Alternative spellings that the URL parser normalizes to private addresses.
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:a9fe:a9fe]/latest/meta-data/',
    'http://2130706433/',
    'http://0x7f.1/',
    'http://0/',
    'http://user:secret@127.0.0.1/',
  ])('refuses private address %s before connecting', async (url) => {
    await expect(fetchHtml(url)).rejects.toThrow(/Sicherheitsgründen/);
  });

  it('refuses hosts that resolve to private addresses', async () => {
    await expect(fetchHtml('http://localhost:4000/api/health')).rejects.toThrow(
      /Sicherheitsgründen/,
    );
  });
});
