import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:3001/auth/callback';

/** Extra browser origins allowed to call this API, comma separated. */
const extraOrigins = (process.env.ADDITIONAL_CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/**
 * True when the browser will treat the session cookie as cross-site — i.e. the
 * frontend and this API are served from different hosts. Drives SameSite=None.
 */
const crossSiteCookies =
  process.env.CROSS_SITE_COOKIES === 'true' ||
  (!!hostOf(frontendUrl) && !!hostOf(redirectUri) && hostOf(frontendUrl) !== hostOf(redirectUri));

export const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri,
  frontendUrl,
  extraOrigins,
  port: parseInt(process.env.PORT || '3001', 10),
  isProduction,
  crossSiteCookies,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  /** Daily per-session cap on YouTube playlist creations (write quota guard). */
  dailyExportLimit: parseInt(process.env.DAILY_EXPORT_LIMIT || '3', 10),
};

/**
 * Fails fast in production when a required credential is missing, rather than
 * letting the deployment boot and 500 on the first real request.
 */
export function validateConfig(): void {
  const required: Array<[string, string]> = [
    ['GOOGLE_CLIENT_ID', googleConfig.clientId],
    ['GOOGLE_CLIENT_SECRET', googleConfig.clientSecret],
    ['GEMINI_API_KEY', googleConfig.geminiApiKey],
    ['DATABASE_URL', googleConfig.databaseUrl],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length === 0) return;

  const summary = `Missing environment variable(s): ${missing.join(', ')}`;
  if (isProduction) {
    throw new Error(`[Config] ${summary}. Refusing to start in production.`);
  }
  console.warn(`[Config Warning] ${summary}. Some features will fall back or fail.`);
}
