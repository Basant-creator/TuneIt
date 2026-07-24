import { Request, Response } from 'express';
import { YtMusicService } from '../services/ytmusicService';
import { googleConfig } from '../config/ytmusic';
import { handleControllerError } from '../utils/errorHandler';

export const login = async (req: Request, res: Response) => {
  try {
    const ytmusicService = YtMusicService.getInstance();
    const authUrl = ytmusicService.getAuthUrl();
    res.redirect(authUrl);
  } catch (err: any) {
    handleControllerError(res, err, '[YtMusicController] Error during login redirect');
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
    handleControllerError(res, err, '[YtMusicController] Google token exchange failed', 400);
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const ytmusicService = YtMusicService.getInstance();
    const profile = await ytmusicService.getUserProfile();
    res.json(profile);
  } catch (err: any) {
    handleControllerError(res, err, '[YtMusicController] Error in getMe');
  }
};

export const getPlaylists = async (req: Request, res: Response) => {
  try {
    const ytmusicService = YtMusicService.getInstance();
    const playlists = await ytmusicService.getUserPlaylists();
    res.json(playlists);
  } catch (err: any) {
    handleControllerError(res, err, '[YtMusicController] Error in getPlaylists');
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
    handleControllerError(res, err, `[YtMusicController] Error fetching tracks for playlist ${id}`);
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
    handleControllerError(res, err, '[YtMusicController] Error exporting playlist');
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const ytmusicService = YtMusicService.getInstance();
    const tracks = await ytmusicService.getPlaylistTracks(id);
    if (tracks.length === 0) {
      return res.json({ recommendations: [] });
    }

    const { getRecommendedTracks, analyzeTrackMetadata } = await import('../services/aiService');

    // Take up to 4 seed tracks
    const seedTracks = tracks.slice(-4);
    const proposals = await getRecommendedTracks(seedTracks);

    const recommendations = [];
    for (const prop of proposals) {
      const searchRes = await ytmusicService.searchTrack(`${prop.title} ${prop.artist}`);
      if (!searchRes || !searchRes.videoId) continue;

      const aiMeta = await analyzeTrackMetadata({
        title: searchRes.title,
        artist: searchRes.artist,
        tags: [],
      });

      recommendations.push({
        videoId: searchRes.videoId,
        title: searchRes.title,
        artist: searchRes.artist,
        estimatedBpm: aiMeta?.estimated_bpm || 122,
        intensityScore: aiMeta?.intensity_score || 0.45,
        vibeReview: aiMeta?.vibe_review || prop.rationale || 'Seamless energy continuation with matching harmonic flow.',
      });
    }

    res.json({ recommendations });
  } catch (err: any) {
    handleControllerError(res, err, `[YtMusicController] Error generating recommendations for playlist ${id}`);
  }
};

