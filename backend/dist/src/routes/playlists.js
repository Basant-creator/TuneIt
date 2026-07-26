"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytmusicController_1 = require("../controllers/ytmusicController");
const engineController_1 = require("../controllers/engineController");
const router = (0, express_1.Router)();
router.get('/me', ytmusicController_1.getMe);
router.get('/playlists', ytmusicController_1.getPlaylists);
router.get('/playlists/:id/tracks', ytmusicController_1.getPlaylistTracks);
router.get('/playlists/:id/recommendations', ytmusicController_1.getRecommendations);
// Playlist Rearrangement Engines
router.post('/playlists/:id/drift', engineController_1.driftRearrange);
router.post('/playlists/:id/frame', engineController_1.frameRearrange);
router.post('/playlists/:id/unhinged', engineController_1.unhingedRearrange);
router.post('/playlists/export', ytmusicController_1.exportPlaylist);
exports.default = router;
