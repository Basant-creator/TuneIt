import { Request, Response } from 'express';
import { YtMusicService } from '../services/ytmusicService';
import { googleConfig } from '../config/ytmusic';

export const login = async (req: Request, res: Response) => {
  try {
    const ytmusicService = YtMusicService.getInstance();
    const authUrl = ytmusicService.getAuthUrl();
    res.redirect(authUrl);
  } catch (err: any) {
    console.error('[YtMusicController] Error during login redirect:', err?.message || err);
    res.status(500).json({
      error: 'Failed to initiate Google login flow',
      details: err?.message || err,
    });
  }
};

export const callback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    console.error('[YtMusicController] Error in Google callback redirect:', error);
    return res.status(400).json({ error: `Google authorization failed: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }

  try {
    const ytmusicService = YtMusicService.getInstance();
    await ytmusicService.handleCallback(code);
    
    // Redirect browser back to the frontend
    res.redirect(googleConfig.frontendUrl);
  } catch (err: any) {
    console.error('[YtMusicController] Google token exchange failed:', err?.message || err);
    res.status(400).json({
      error: 'Invalid authorization code or token exchange failed',
      details: err?.message || err,
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const ytmusicService = YtMusicService.getInstance();
    const profile = await ytmusicService.getUserProfile();
    res.json(profile);
  } catch (err: any) {
    console.error('[YtMusicController] Error in getMe:', err?.message || err);
    const statusCode = err?.message?.includes('session') || err?.message?.includes('Unauthorized') ? 401 : 500;
    res.status(statusCode).json({
      error: 'Failed to fetch YouTube profile',
      details: err?.message || err,
    });
  }
};

export const getPlaylists = async (req: Request, res: Response) => {
  try {
    const ytmusicService = YtMusicService.getInstance();
    const playlists = await ytmusicService.getUserPlaylists();
    res.json(playlists);
  } catch (err: any) {
    console.error('[YtMusicController] Error in getPlaylists:', err?.message || err);
    const statusCode = err?.message?.includes('session') || err?.message?.includes('Unauthorized') ? 401 : 500;
    res.status(statusCode).json({
      error: 'Failed to fetch YouTube playlists',
      details: err?.message || err,
    });
  }
};
