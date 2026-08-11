"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = exports.exportPlaylist = exports.getPlaylistTracks = exports.getPlaylists = exports.getMe = exports.callback = exports.login = void 0;
const ytmusicService_1 = require("../services/ytmusicService");
const trackCacheService_1 = require("../services/trackCacheService");
const exportRateLimiter_1 = require("../utils/exportRateLimiter");
const ytmusic_1 = require("../config/ytmusic");
const errorHandler_1 = require("../utils/errorHandler");
const login = async (req, res) => {
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        const authUrl = ytmusicService.getAuthUrl();
        res.redirect(authUrl);
    }
    catch (err) {
        (0, errorHandler_1.handleControllerError)(res, err, '[YtMusicController] Error during login redirect');
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
        (0, errorHandler_1.handleControllerError)(res, err, '[YtMusicController] Google token exchange failed', 400);
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
        (0, errorHandler_1.handleControllerError)(res, err, '[YtMusicController] Error in getMe');
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
        (0, errorHandler_1.handleControllerError)(res, err, '[YtMusicController] Error in getPlaylists');
    }
};
exports.getPlaylists = getPlaylists;
const getPlaylistTracks = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'Playlist ID is required' });
    }
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        const tracks = await ytmusicService.getPlaylistTracks(id);
        res.json({ tracks });
    }
    catch (err) {
        (0, errorHandler_1.handleControllerError)(res, err, `[YtMusicController] Error fetching tracks for playlist ${id}`);
    }
};
exports.getPlaylistTracks = getPlaylistTracks;
const exportPlaylist = async (req, res) => {
    const { title, videoIds, description } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Playlist title is required' });
    }
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
        return res.status(400).json({ error: 'At least one track (videoId) is required' });
    }
    // Rate limit check: Max 3 exports per day per client IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown_client';
    const limitStatus = (0, exportRateLimiter_1.checkAndIncrementExportLimit)(clientIp, 3);
    if (!limitStatus.allowed) {
        return res.status(429).json({
            error: 'Daily YouTube export limit reached (3/3 playlists per day). You can download your playlist sequence as a CSV file instead!',
            remainingExports: 0,
            downloadCsvSuggested: true,
        });
    }
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        // 1. Create playlist shell
        const newPlaylist = await ytmusicService.createPlaylist(title, description);
        // 2. Add tracks to playlist
        await ytmusicService.addTracksToPlaylist(newPlaylist.id, videoIds);
        res.status(201).json({
            message: 'Playlist exported successfully to YouTube Music',
            playlist: newPlaylist,
            remainingExports: limitStatus.remaining,
        });
    }
    catch (err) {
        (0, errorHandler_1.handleControllerError)(res, err, '[YtMusicController] Error exporting playlist');
    }
};
exports.exportPlaylist = exportPlaylist;
const getRecommendations = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'Playlist ID is required' });
    }
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        const tracks = await ytmusicService.getPlaylistTracks(id);
        if (tracks.length === 0) {
            return res.json({ recommendations: [] });
        }
        const { getRecommendedTracks } = await Promise.resolve().then(() => __importStar(require('../services/aiService')));
        // Take up to 4 seed tracks
        const seedTracks = tracks.slice(-4);
        const proposals = await getRecommendedTracks(seedTracks);
        const recommendations = [];
        for (const prop of proposals) {
            const searchRes = await ytmusicService.searchTrack(`${prop.title} ${prop.artist}`);
            if (!searchRes || !searchRes.videoId)
                continue;
            const cachedTrack = await (0, trackCacheService_1.getOrAnalyzeTrack)({
                title: searchRes.title,
                artist: searchRes.artist,
                tags: [],
                videoId: searchRes.videoId,
            });
            recommendations.push({
                videoId: searchRes.videoId,
                title: searchRes.title,
                artist: searchRes.artist,
                estimatedBpm: cachedTrack.estimatedBpm,
                intensityScore: cachedTrack.intensityScore,
                vibeReview: prop.rationale || 'Seamless energy continuation with matching harmonic flow.',
            });
        }
        res.json({ recommendations });
    }
    catch (err) {
        (0, errorHandler_1.handleControllerError)(res, err, `[YtMusicController] Error generating recommendations for playlist ${id}`);
    }
};
exports.getRecommendations = getRecommendations;
