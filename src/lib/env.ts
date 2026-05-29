/**
 * Type-safe environment variable registry.
 * Provides easy autocompletion and enforces checks to avoid silent failures in production.
 */

const requiredEnvVars = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'SPOTIFY_REDIRECT_URI',
] as const;

export function validateEnv() {
  if (process.env.NODE_ENV === 'production') {
    const missing = requiredEnvVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `❌ Missing required environment variables: ${missing.join(
          ', '
        )}. Please configure them in Vercel or your production environment.`
      );
    }
  }
}

export const env = {
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID || '',
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
  spotifyRedirectUri: process.env.SPOTIFY_REDIRECT_URI || '',
  nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',
};
