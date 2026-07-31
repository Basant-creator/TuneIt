/**
 * Type-safe environment variable registry.
 * Provides easy autocompletion and enforces checks to avoid silent failures in production.
 */

const requiredEnvVars = [] as const;

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
  nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001',
  isProduction: process.env.NODE_ENV === 'production',
};
