"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const playlistController_1 = require("../controllers/playlistController");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
router.get('/me', authController_1.getMe);
router.get('/playlists', playlistController_1.getPlaylists);
exports.default = router;
