import { Request, Response } from 'express';
import { SpotifyService } from '../services/spotifyService';

export const login = (req: Request, res: Response) => {
  try {
    const spotifyService = SpotifyService.getInstance();
    const state = (req.query.state as string) || 'tuneit-state';
    const authUrl = spotifyService.getAuthUrl(state);
    res.redirect(authUrl);
  } catch (err: any) {
    console.error('[AuthController] Error starting Spotify login:', err);
    res.status(500).json({ error: 'Failed to initiate Spotify login flow' });
  }
};

export const callback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    console.error('[AuthController] Error from Spotify callback redirect:', error);
    return res.status(400).json({ error: `Spotify authorization failed: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }

  try {
    const spotifyService = SpotifyService.getInstance();
    await spotifyService.handleCallback(code);
    
    // Redirect the browser back to the frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
    res.redirect(frontendUrl);
  } catch (err: any) {
    console.error('[AuthController] Callback token exchange failed:', err?.message || err);
    res.status(400).json({
      error: 'Invalid authorization code or token exchange failed',
      details: err?.message || err,
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const spotifyService = SpotifyService.getInstance();
    if (!spotifyService.hasSession()) {
      return res.status(401).json({ error: 'Unauthorized. No active Spotify session.' });
    }
    const profile = await spotifyService.getUserProfile();
    res.json(profile);
  } catch (err: any) {
    console.error('[AuthController] Error in getMe:', err?.message || err);
    
    const statusCode = err?.statusCode || (err?.message?.includes('session') ? 401 : 500);
    res.status(statusCode).json({
      error: 'Failed to fetch Spotify profile',
      details: err?.message || err,
    });
  }
};
