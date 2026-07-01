import { Router } from 'express';
import { getPlaylists, getMe } from '../controllers/ytmusicController';

const router = Router();

router.get('/me', getMe);
router.get('/playlists', getPlaylists);

export default router;
