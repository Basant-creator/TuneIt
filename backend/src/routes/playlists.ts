import { Router } from 'express';
import {
  getPlaylists,
  getMe,
  getPlaylistTracks,
  exportPlaylist,
  getRecommendations,
} from '../controllers/ytmusicController';
import {
  rearrangePlaylist,
  riseRearrange,
  driftRearrange,
  frameRearrange,
  unhingedRearrange,
} from '../controllers/engineController';
import { requireSession } from '../middleware/session';

const router = Router();

// Everything under /api needs a connected YouTube session.
router.use(requireSession);

router.get('/me', getMe);
router.get('/playlists', getPlaylists);
router.get('/playlists/:id/tracks', getPlaylistTracks);
router.get('/playlists/:id/recommendations', getRecommendations);

// Mode-agnostic rearrangement endpoint (preferred): body { mode: 'bu'|'df'|'ph'|'cm' }
router.post('/playlists/:id/rearrange', rearrangePlaylist);

// Named engine endpoints, kept for direct API use and backwards compatibility.
router.post('/playlists/:id/rise', riseRearrange);
router.post('/playlists/:id/drift', driftRearrange);
router.post('/playlists/:id/frame', frameRearrange);
router.post('/playlists/:id/unhinged', unhingedRearrange);

router.post('/playlists/export', exportPlaylist);

export default router;
