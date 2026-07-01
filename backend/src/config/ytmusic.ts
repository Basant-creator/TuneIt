import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:3001/auth/callback',
  frontendUrl: process.env.FRONTEND_URL || 'http://127.0.0.1:3000',
  port: parseInt(process.env.PORT || '3001', 10),
};

if (!googleConfig.clientId || !googleConfig.clientSecret) {
  console.warn(`[Config Warning] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in your .env file.`);
}
