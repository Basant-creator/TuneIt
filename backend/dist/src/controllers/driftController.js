"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftRearrange = void 0;
const ytmusicService_1 = require("../services/ytmusicService");
const aiService_1 = require("../services/aiService");
const driftAlgorithm_1 = require("../utils/driftAlgorithm");
const errorHandler_1 = require("../utils/errorHandler");
const db_1 = __importDefault(require("../config/db"));
const bottleneck_1 = __importDefault(require("bottleneck"));
const limiter = new bottleneck_1.default({
    reservoir: 14, // 14 tokens
    reservoirRefreshAmount: 14,
    reservoirRefreshInterval: 60000, // every 60 seconds
    maxConcurrent: 1,
    minTime: 1000, // 1 second minimum between requests
});
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
                where: { videoId: track.videoId },
            });
            const isDefaultFallback = dbTrack && dbTrack.estimatedBpm === 120 && dbTrack.intensityScore === 0.5;
            if (!dbTrack || isDefaultFallback) {
                // Run AI Analysis
                console.log(`[DriftController] Analyzing ${track.title} with Gemini AI...`);
                const analysis = await limiter.schedule(() => (0, aiService_1.analyzeTrackMetadata)({
                    title: track.title,
                    artist: track.artist,
                    tags: track.tags,
                }));
                const estimatedBpm = analysis?.estimated_bpm || 120; // Default fallback
                const intensityScore = analysis?.intensity_score || 0.5;
                // Save to DB
                if (!dbTrack) {
                    dbTrack = await db_1.default.youtubeTrack.create({
                        data: {
                            videoId: track.videoId,
                            title: track.title.substring(0, 255),
                            artist: track.artist.substring(0, 255),
                            estimatedBpm,
                            intensityScore,
                        },
                    });
                }
                else {
                    // Update the existing corrupted/fallback record
                    dbTrack = await db_1.default.youtubeTrack.update({
                        where: { videoId: track.videoId },
                        data: {
                            estimatedBpm,
                            intensityScore,
                            title: track.title.substring(0, 255),
                            artist: track.artist.substring(0, 255),
                        },
                    });
                }
            }
            driftTracks.push({
                videoId: track.videoId,
                title: track.title,
                artist: track.artist,
                estimatedBpm: dbTrack.estimatedBpm,
                intensityScore: dbTrack.intensityScore,
                originalIndex: track.originalIndex,
            });
        }
        // 3. Algorithm Sorting
        console.log(`[DriftController] Running Drift Algorithm on ${driftTracks.length} tracks...`);
        const { tracks: rearrangedPlaylist, harshTracks } = (0, driftAlgorithm_1.generateDriftPlaylist)(driftTracks);
        res.json({
            message: 'Playlist rearranged successfully',
            originalCount: driftTracks.length,
            filteredCount: harshTracks.length,
            tracks: rearrangedPlaylist,
            harshTracks,
        });
    }
    catch (err) {
        (0, errorHandler_1.handleControllerError)(res, err, '[DriftController] Error during drift rearrangement');
    }
};
exports.driftRearrange = driftRearrange;
