"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaylists = void 0;
const spotifyService_1 = require("../services/spotifyService");
const getPlaylists = async (req, res) => {
    try {
        const spotifyService = spotifyService_1.SpotifyService.getInstance();
        if (!spotifyService.hasSession()) {
            return res.status(401).json({ error: 'Unauthorized. No active Spotify session.' });
        }
        const limit = parseInt(req.query.limit || '20', 10);
        const offset = parseInt(req.query.offset || '0', 10);
        if (isNaN(limit) || limit < 0) {
            return res.status(400).json({ error: 'Invalid limit parameter' });
        }
        if (isNaN(offset) || offset < 0) {
            return res.status(400).json({ error: 'Invalid offset parameter' });
        }
        const playlists = await spotifyService.getUserPlaylists(limit, offset);
        res.json(playlists);
    }
    catch (err) {
        console.error('[PlaylistController] Error in getPlaylists:', err?.message || err);
        const statusCode = err?.statusCode || (err?.message?.includes('session') ? 401 : 500);
        res.status(statusCode).json({
            error: 'Failed to fetch Spotify playlists',
            details: err?.message || err,
        });
    }
};
exports.getPlaylists = getPlaylists;
