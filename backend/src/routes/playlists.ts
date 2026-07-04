import { Router } from 'express';
import { getPlaylists, getMe } from '../controllers/ytmusicController';
import { driftRearrange } from '../controllers/driftController';

const router = Router();

router.get('/me', getMe);
router.get('/playlists', getPlaylists);
router.post('/playlists/:id/drift', driftRearrange);

export default router;
