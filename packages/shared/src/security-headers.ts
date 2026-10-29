export interface HttpHeader {
  key: string;
  value: string;
}

/**
 * Response headers for every page and API response (ADR-028). Framing is limited to the own
 * origin; a full script CSP with nonces is left out. HSTS only in production, where TLS is on.
 */
export function securityHeaders(production: boolean): HttpHeader[] {
  const headers: HttpHeader[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    {
      key: 'Content-Security-Policy',
      value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
    },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ];
  if (production) {
    headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000' });
  }
  return headers;
}
