/**
 * Shared authentication helper for protected API routes.
 * Uses the CRON_SECRET environment variable as a Bearer token.
 */
export function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}
