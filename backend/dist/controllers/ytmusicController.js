"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaylists = exports.getMe = exports.callback = exports.login = void 0;
const ytmusicService_1 = require("../services/ytmusicService");
const ytmusic_1 = require("../config/ytmusic");
const login = async (req, res) => {
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        const authUrl = ytmusicService.getAuthUrl();
        res.redirect(authUrl);
    }
    catch (err) {
        console.error('[YtMusicController] Error during login redirect:', err?.message || err);
        res.status(500).json({
            error: 'Failed to initiate Google login flow',
            details: err?.message || err,
        });
    }
};
exports.login = login;
const callback = async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    if (error) {
        console.error('[YtMusicController] Error in Google callback redirect:', error);
        return res.status(400).json({ error: `Google authorization failed: ${error}` });
    }
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
    }
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        await ytmusicService.handleCallback(code);
        // Redirect browser back to the frontend
        res.redirect(ytmusic_1.googleConfig.frontendUrl);
    }
    catch (err) {
        console.error('[YtMusicController] Google token exchange failed:', err?.message || err);
        res.status(400).json({
            error: 'Invalid authorization code or token exchange failed',
            details: err?.message || err,
        });
    }
};
exports.callback = callback;
const getMe = async (req, res) => {
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        const profile = await ytmusicService.getUserProfile();
        res.json(profile);
    }
    catch (err) {
        console.error('[YtMusicController] Error in getMe:', err?.message || err);
        const statusCode = err?.message?.includes('session') || err?.message?.includes('Unauthorized') ? 401 : 500;
        res.status(statusCode).json({
            error: 'Failed to fetch YouTube profile',
            details: err?.message || err,
        });
    }
};
exports.getMe = getMe;
const getPlaylists = async (req, res) => {
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        const playlists = await ytmusicService.getUserPlaylists();
        res.json(playlists);
    }
    catch (err) {
        console.error('[YtMusicController] Error in getPlaylists:', err?.message || err);
        const statusCode = err?.message?.includes('session') || err?.message?.includes('Unauthorized') ? 401 : 500;
        res.status(statusCode).json({
            error: 'Failed to fetch YouTube playlists',
            details: err?.message || err,
        });
    }
};
exports.getPlaylists = getPlaylists;
