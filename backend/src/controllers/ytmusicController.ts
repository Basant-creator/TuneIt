import { Request, Response } from 'express';
import { getOrAnalyzeTrack } from '../services/trackCacheService';
import { checkAndIncrementExportLimit } from '../utils/exportRateLimiter';
import { googleConfig } from '../config/ytmusic';
import { handleControllerError } from '../utils/errorHandler';
import { startSession, clearSessionCookie } from '../middleware/session';
import { getSessionService, destroySession } from '../services/sessionStore';

export const login = async (req: Request, res: Response) => {
  try {
    // Every login attempt gets a fresh session id. It travels to Google as the
    // OAuth `state` parameter, which both binds the callback to this browser
    // and doubles as CSRF protection.
    const { sessionId, service } = startSession(res);
    res.redirect(service.getAuthUrl(sessionId));
  } catch (err: any) {
    handleControllerError(res, err, '[YtMusicController] Error during login redirect');
  }
};

export const callback = async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;

  const failureRedirect = (reason: string) =>
    res.redirect(`${googleConfig.frontendUrl}/?auth_error=${encodeURIComponent(reason)}`);

  if (error) {
    console.error('[YtMusicController] Google callback returned an error:', error);
    return failureRedirect(error);
  }

  if (!code) return failureRedirect('missing_code');

  // Prefer the state value, falling back to the cookie, so the callback works
  // even if the browser drops the cookie on the cross-site redirect.
  const sessionId = state || req.sessionId;
  const service = getSessionService(sessionId);

  if (!sessionId || !service) {
    console.warn('[YtMusicController] Callback received with no matching session.');
    return failureRedirect('session_expired');
  }

  try {
    await service.handleCallback(code);
    return res.redirect(`${googleConfig.frontendUrl}/playlists`);
  } catch (err: any) {
    console.error('[YtMusicController] Google token exchange failed:', err?.message || err);
    return failureRedirect('token_exchange_failed');
  }
};

/** Lets the frontend render the right state without triggering a 401 in the console. */
export const authStatus = async (req: Request, res: Response) => {
  const authenticated = !!req.ytmusic?.hasSession();
  res.json({ authenticated, loginUrl: '/auth/login' });
};

export const logout = async (req: Request, res: Response) => {
  destroySession(req.sessionId);
  clearSessionCookie(res);
  res.json({ message: 'Signed out' });
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const profile = await req.ytmusic!.getUserProfile();
    res.json(profile);
  } catch (err: any) {
    handleControllerError(res, err, '[YtMusicController] Error in getMe');
  }
};

export const getPlaylists = async (req: Request, res: Response) => {
  try {
    const playlists = await req.ytmusic!.getUserPlaylists();
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
    const tracks = await req.ytmusic!.getPlaylistTracks(id);
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

  if (videoIds.some((id) => typeof id !== 'string' || !id.trim())) {
    return res.status(400).json({ error: 'Every videoId must be a non-empty string' });
  }

  // Rate limit per session (falls back to IP for clients without a cookie),
  // so one visitor cannot burn the whole YouTube write quota.
  const rateKey =
    req.sessionId ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown_client';
  const limit = googleConfig.dailyExportLimit;
  const limitStatus = checkAndIncrementExportLimit(rateKey, limit);

  if (!limitStatus.allowed) {
    return res.status(429).json({
      error: `Daily YouTube export limit reached (${limit}/${limit} playlists per day). You can download your playlist sequence as a CSV file instead!`,
      remainingExports: 0,
      downloadCsvSuggested: true,
    });
  }

  try {
    const ytmusicService = req.ytmusic!;

    // 1. Create playlist shell
    const newPlaylist = await ytmusicService.createPlaylist(title, description);

    // 2. Add tracks to playlist
    await ytmusicService.addTracksToPlaylist(newPlaylist.id, videoIds);

    res.status(201).json({
      message: 'Playlist exported successfully to YouTube Music',
      playlist: newPlaylist,
      remainingExports: limitStatus.remaining,
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
    const ytmusicService = req.ytmusic!;
    const tracks = await ytmusicService.getPlaylistTracks(id);
    if (tracks.length === 0) {
      return res.json({ recommendations: [] });
    }

    const { getRecommendedTracks } = await import('../services/aiService');

    // Take up to 4 seed tracks
    const seedTracks = tracks.slice(-4);
    const proposals = await getRecommendedTracks(seedTracks);

    const existingVideoIds = new Set(tracks.map((t) => t.videoId));
    const recommendations = [];

    for (const prop of proposals) {
      const searchRes = await ytmusicService.searchTrack(`${prop.title} ${prop.artist}`);
      if (!searchRes || !searchRes.videoId) continue;
      // Never recommend a track the playlist already contains.
      if (existingVideoIds.has(searchRes.videoId)) continue;
      existingVideoIds.add(searchRes.videoId);

      const cachedTrack = await getOrAnalyzeTrack({
        title: searchRes.title,
        artist: searchRes.artist,
        tags: [],
        videoId: searchRes.videoId,
      });

      recommendations.push({
        videoId: searchRes.videoId,
        title: searchRes.title,
        artist: searchRes.artist,
        estimatedBpm: cachedTrack.estimatedBpm,
        intensityScore: cachedTrack.intensityScore,
        vibeReview: prop.rationale || 'Seamless energy continuation with matching harmonic flow.',
      });
    }

    res.json({ recommendations });
  } catch (err: any) {
    handleControllerError(res, err, `[YtMusicController] Error generating recommendations for playlist ${id}`);
  }
};
