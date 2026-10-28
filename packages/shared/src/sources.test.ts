import { describe, expect, it } from 'vitest';
import { LIMITS } from './limits.js';
import { createSourceSchema, hasPdfSignature } from './sources.js';

describe('createSourceSchema', () => {
  it('accepts http and https URLs', () => {
    expect(
      createSourceSchema.safeParse({ type: 'URL', url: 'https://example.com/a' }).success,
    ).toBe(true);
    expect(createSourceSchema.safeParse({ type: 'URL', url: 'http://example.com' }).success).toBe(
      true,
    );
  });

  it.each(['file:///etc/passwd', 'ftp://example.com', 'javascript:alert(1)', 'not a url'])(
    'rejects %s',
    (url) => {
      expect(createSourceSchema.safeParse({ type: 'URL', url }).success).toBe(false);
    },
  );

  it('trims text and enforces the length limit', () => {
    const ok = createSourceSchema.parse({ type: 'TEXT', text: '  Hugin und Munin  ' });
    expect(ok).toMatchObject({ type: 'TEXT', text: 'Hugin und Munin' });

    const tooLong = createSourceSchema.safeParse({
      type: 'TEXT',
      text: 'x'.repeat(LIMITS.maxTextChars + 1),
    });
    expect(tooLong.success).toBe(false);
  });

  it('rejects empty text and unknown types', () => {
    expect(createSourceSchema.safeParse({ type: 'TEXT', text: '   ' }).success).toBe(false);
    expect(createSourceSchema.safeParse({ type: 'PDF' }).success).toBe(false);
  });
});

describe('hasPdfSignature', () => {
  it('detects the %PDF- header', () => {
    expect(hasPdfSignature(new TextEncoder().encode('%PDF-1.7\n...'))).toBe(true);
    expect(hasPdfSignature(new TextEncoder().encode('<html>'))).toBe(false);
    expect(hasPdfSignature(new Uint8Array())).toBe(false);
  });
});
