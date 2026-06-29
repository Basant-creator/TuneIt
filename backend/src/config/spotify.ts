import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const spotifyConfig = {
  clientId: process.env.SPOTIFY_CLIENT_ID || '',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3001/auth/callback',
  frontendUrl: process.env.FRONTEND_URL || 'http://127.0.0.1:5173',
  port: parseInt(process.env.PORT || '3001', 10),
};

// Validate that required environment variables are set
const requiredEnv = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];
for (const envVar of requiredEnv) {
  if (!process.env[envVar] || process.env[envVar] === `your_spotify_${envVar.toLowerCase().substring(8)}_here`) {
    console.warn(`[Config Warning] Environment variable ${envVar} is not configured yet in the .env file.`);
  }
}
