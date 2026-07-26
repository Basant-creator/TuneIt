"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytmusicController_1 = require("../controllers/ytmusicController");
const router = (0, express_1.Router)();
router.get('/login', ytmusicController_1.login);
router.get('/callback', ytmusicController_1.callback);
exports.default = router;
