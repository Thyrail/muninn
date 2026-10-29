import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Optimistic gate: redirects visitors without a session cookie to /login.
 * The real session check happens server-side in the protected pages.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except auth pages, API, Next internals, the share image and static files.
  matcher: [
    '/((?!login|register|api|_next|icon.svg|favicon.ico|opengraph-image|.*\\.(?:png|svg|jpg|webp)$).*)',
  ],
};
