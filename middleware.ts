export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    // Protect forum write routes
    '/discuss/:slug/new',
    '/settings/:path*',
    // Auth.js needs these matched for session handling
    '/api/auth/:path*',
  ],
};
