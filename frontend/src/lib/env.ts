/**
 * Client-visible configuration.
 *
 * Only NEXT_PUBLIC_* values belong here — Next.js inlines them into the browser
 * bundle at build time, so anything placed here is public by definition.
 */

function normalize(url: string): string {
  return url.replace(/\/+$/, '');
}

export const env = {
  /** Base URL of the TuneIt backend API. */
  apiUrl: normalize(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'),
  /** Public URL this app is served from. */
  appUrl: normalize(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  isProduction: process.env.NODE_ENV === 'production',
};

/**
 * Warns at startup when a production build is still pointing at localhost —
 * the single most common cause of a deployed frontend that cannot reach its API.
 */
export function validateEnv(): void {
  if (!env.isProduction) return;

  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn(
      '[env] NEXT_PUBLIC_API_URL is not set; falling back to http://127.0.0.1:3001. ' +
        'Set it at build time or the deployed app will not reach the backend.'
    );
  } else if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(env.apiUrl)) {
    console.warn(`[env] NEXT_PUBLIC_API_URL points at ${env.apiUrl} in a production build.`);
  }
}
