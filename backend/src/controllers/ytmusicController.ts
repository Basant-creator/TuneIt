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

export const getPlaylistTracks = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const ytmusicService = YtMusicService.getInstance();
    const tracks = await ytmusicService.getPlaylistTracks(id);
    res.json({ tracks });
  } catch (err: any) {
    console.error(`[YtMusicController] Error fetching tracks for playlist ${id}:`, err?.message || err);
    const statusCode = err?.message?.includes('session') || err?.message?.includes('Unauthorized') ? 401 : 500;
    res.status(statusCode).json({
      error: 'Failed to fetch playlist tracks',
      details: err?.message || err,
    });
  }
};

export const exportPlaylist = async (req: Request, res: Response) => {
  const { title, videoIds, description } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Playlist title is required' });
  }

  if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({ error: 'At least one track (videoId) is required' });
  }

  try {
    const ytmusicService = YtMusicService.getInstance();
    
    // 1. Create playlist shell
    const newPlaylist = await ytmusicService.createPlaylist(title, description);

    // 2. Add tracks to playlist
    await ytmusicService.addTracksToPlaylist(newPlaylist.id, videoIds);

    res.status(201).json({
      message: 'Playlist exported successfully to YouTube Music',
      playlist: newPlaylist,
    });
  } catch (err: any) {
    console.error('[YtMusicController] Error exporting playlist:', err?.message || err);
    const statusCode = err?.message?.includes('session') || err?.message?.includes('Unauthorized') ? 401 : 500;
    res.status(statusCode).json({
      error: 'Failed to export playlist to YouTube Music',
      details: err?.message || err,
    });
  }
};
