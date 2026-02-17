import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PATTERNS = [
  /^\/discuss\/[^/]+\/new$/,
  /^\/settings(\/|$)/,
];

export function proxy(request: NextRequest) {
  // NOTE: www -> non-www redirect is handled by Vercel's domain configuration.
  // Do NOT add a redirect here — it conflicts with Vercel's platform-level redirect
  // and causes a "Redirect error" in Google Search Console.

  const { pathname } = request.nextUrl;

  // Auth route protection: redirect to login if no session on protected routes
  const isProtected = PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
  if (isProtected) {
    const sessionToken =
      request.cookies.get('authjs.session-token')?.value ||
      request.cookies.get('__Secure-authjs.session-token')?.value;

    if (!sessionToken) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  // Add security headers (additional to next.config.ts)
  response.headers.set('X-Robots-Tag', 'index, follow');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Rate limiting headers (informational)
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
