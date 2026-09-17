import { Router } from 'express';
import { login, callback, authStatus, logout } from '../controllers/ytmusicController';

const router = Router();

router.get('/login', login);
router.get('/callback', callback);
router.get('/status', authStatus);
router.post('/logout', logout);

export default router;
