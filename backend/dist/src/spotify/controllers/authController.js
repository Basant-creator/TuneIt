"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.callback = exports.login = void 0;
const spotifyService_1 = require("../services/spotifyService");
const login = (req, res) => {
    try {
        const spotifyService = spotifyService_1.SpotifyService.getInstance();
        const state = req.query.state || 'tuneit-state';
        const authUrl = spotifyService.getAuthUrl(state);
        res.redirect(authUrl);
    }
    catch (err) {
        console.error('[AuthController] Error starting Spotify login:', err);
        res.status(500).json({ error: 'Failed to initiate Spotify login flow' });
    }
};
exports.login = login;
const callback = async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    if (error) {
        console.error('[AuthController] Error from Spotify callback redirect:', error);
        return res.status(400).json({ error: `Spotify authorization failed: ${error}` });
    }
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
    }
    try {
        const spotifyService = spotifyService_1.SpotifyService.getInstance();
        await spotifyService.handleCallback(code);
        // Redirect the browser back to the frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
        res.redirect(frontendUrl);
    }
    catch (err) {
        console.error('[AuthController] Callback token exchange failed:', err?.message || err);
        res.status(400).json({
            error: 'Invalid authorization code or token exchange failed',
            details: err?.message || err,
        });
    }
};
exports.callback = callback;
const getMe = async (req, res) => {
    try {
        const spotifyService = spotifyService_1.SpotifyService.getInstance();
        if (!spotifyService.hasSession()) {
            return res.status(401).json({ error: 'Unauthorized. No active Spotify session.' });
        }
        const profile = await spotifyService.getUserProfile();
        res.json(profile);
    }
    catch (err) {
        console.error('[AuthController] Error in getMe:', err?.message || err);
        const statusCode = err?.statusCode || (err?.message?.includes('session') ? 401 : 500);
        res.status(statusCode).json({
            error: 'Failed to fetch Spotify profile',
            details: err?.message || err,
        });
    }
};
exports.getMe = getMe;
