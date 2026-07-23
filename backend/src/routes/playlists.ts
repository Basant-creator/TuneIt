import { Router } from 'express';
import { getPlaylists, getMe, getPlaylistTracks, exportPlaylist } from '../controllers/ytmusicController';
import { driftRearrange } from '../controllers/driftController';

const router = Router();

router.get('/me', getMe);
router.get('/playlists', getPlaylists);
router.get('/playlists/:id/tracks', getPlaylistTracks);
router.post('/playlists/:id/drift', driftRearrange);
router.post('/playlists/export', exportPlaylist);

export default router;
