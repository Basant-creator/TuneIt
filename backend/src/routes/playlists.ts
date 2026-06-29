import { Router } from 'express';
import { getPlaylists } from '../controllers/playlistController';
import { getMe } from '../controllers/authController';

const router = Router();

router.get('/me', getMe);
router.get('/playlists', getPlaylists);

export default router;
