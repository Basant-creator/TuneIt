"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftRearrange = void 0;
const ytmusicService_1 = require("../services/ytmusicService");
const aiService_1 = require("../services/aiService");
const driftAlgorithm_1 = require("../utils/driftAlgorithm");
const db_1 = __importDefault(require("../config/db"));
const driftRearrange = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'Playlist ID is required' });
    }
    try {
        const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
        // 1. Fetch raw tracks from YouTube API
        const rawTracks = await ytmusicService.getPlaylistTracks(id);
        if (rawTracks.length === 0) {
            return res.status(404).json({ error: 'No tracks found in the playlist' });
        }
        const driftTracks = [];
        // 2. Process each track
        for (const track of rawTracks) {
            if (!track.videoId)
                continue;
            // Check cache first
            let dbTrack = await db_1.default.youtubeTrack.findUnique({
                where: { videoId: track.videoId }
            });
            if (!dbTrack) {
                // Run AI Analysis
                console.log(`[DriftController] Analyzing ${track.title} with Gemini AI...`);
                const analysis = await (0, aiService_1.analyzeTrackMetadata)({
                    title: track.title,
                    artist: track.artist,
                    tags: track.tags
                });
                const estimatedBpm = analysis?.estimated_bpm || 120; // Default fallback
                const intensityScore = analysis?.intensity_score || 0.5;
                // Save to DB
                dbTrack = await db_1.default.youtubeTrack.create({
                    data: {
                        videoId: track.videoId,
                        title: track.title.substring(0, 255), // truncate if necessary
                        artist: track.artist.substring(0, 255),
                        estimatedBpm,
                        intensityScore
                    }
                });
            }
            driftTracks.push({
                videoId: track.videoId,
                title: track.title,
                artist: track.artist,
                estimatedBpm: dbTrack.estimatedBpm,
                intensityScore: dbTrack.intensityScore,
                originalIndex: track.originalIndex
            });
        }
        // 3. Algorithm Sorting
        console.log(`[DriftController] Running Drift Algorithm on ${driftTracks.length} tracks...`);
        const rearrangedPlaylist = (0, driftAlgorithm_1.generateDriftPlaylist)(driftTracks);
        res.json({
            message: 'Playlist rearranged successfully',
            originalCount: driftTracks.length,
            filteredCount: driftTracks.length - rearrangedPlaylist.length,
            tracks: rearrangedPlaylist
        });
    }
    catch (err) {
        console.error('[DriftController] Error during drift rearrangement:', err?.message || err);
        res.status(500).json({
            error: 'Failed to apply Drift algorithm',
            details: err?.message || err
        });
    }
};
exports.driftRearrange = driftRearrange;
