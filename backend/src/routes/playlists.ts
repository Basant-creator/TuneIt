import { Router } from 'express';
import { getPlaylists, getMe, getPlaylistTracks, exportPlaylist, getRecommendations } from '../controllers/ytmusicController';
import { driftRearrange, frameRearrange, unhingedRearrange } from '../controllers/engineController';

const router = Router();

router.get('/me', getMe);
router.get('/playlists', getPlaylists);
router.get('/playlists/:id/tracks', getPlaylistTracks);
router.get('/playlists/:id/recommendations', getRecommendations);

// Playlist Rearrangement Engines
router.post('/playlists/:id/drift', driftRearrange);
router.post('/playlists/:id/frame', frameRearrange);
router.post('/playlists/:id/unhinged', unhingedRearrange);

router.post('/playlists/export', exportPlaylist);

export default router;
