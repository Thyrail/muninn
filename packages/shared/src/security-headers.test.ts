import { describe, expect, it } from 'vitest';
import { securityHeaders } from './security-headers.js';

describe('securityHeaders', () => {
  it('sets HSTS only in production', () => {
    const keys = (production: boolean) => securityHeaders(production).map((header) => header.key);
    expect(keys(true)).toContain('Strict-Transport-Security');
    expect(keys(false)).not.toContain('Strict-Transport-Security');
  });

  it('allows framing only by the own origin', () => {
    const csp = securityHeaders(true).find((header) => header.key === 'Content-Security-Policy');
    expect(csp?.value).toContain("frame-ancestors 'self'");
  });
});
