"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unhingedRearrange = exports.frameRearrange = exports.driftRearrange = void 0;
const ytmusicService_1 = require("../services/ytmusicService");
const aiService_1 = require("../services/aiService");
const driftAlgorithm_1 = require("../utils/driftAlgorithm");
const frameAlgorithm_1 = require("../utils/frameAlgorithm");
const unhingedAlgorithm_1 = require("../utils/unhingedAlgorithm");
const errorHandler_1 = require("../utils/errorHandler");
const db_1 = __importDefault(require("../config/db"));
const bottleneck_1 = __importDefault(require("bottleneck"));
const limiter = new bottleneck_1.default({
    reservoir: 14,
    reservoirRefreshAmount: 14,
    reservoirRefreshInterval: 60000,
    maxConcurrent: 1,
    minTime: 1000,
});
/**
 * Helper to fetch tracks from YouTube API, analyze/enrich via Gemini AI, and cache in Prisma PostgreSQL DB.
 */
async function fetchAndEnrichTracks(playlistId) {
    const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
    const rawTracks = await ytmusicService.getPlaylistTracks(playlistId);
    if (rawTracks.length === 0) {
        return { rawTracks: [], enrichedTracks: [] };
    }
    const enrichedTracks = [];
    for (const track of rawTracks) {
        if (!track.videoId)
            continue;
        let dbTrack = await db_1.default.youtubeTrack.findUnique({
            where: { videoId: track.videoId },
        });
        const isDefaultFallback = dbTrack && dbTrack.estimatedBpm === 120 && dbTrack.intensityScore === 0.5;
        if (!dbTrack || isDefaultFallback) {
            console.log(`[EngineController] Analyzing ${track.title} with Gemini AI...`);
            const analysis = await limiter.schedule(() => (0, aiService_1.analyzeTrackMetadata)({
                title: track.title,
                artist: track.artist,
                tags: track.tags,
            }));
            const estimatedBpm = analysis?.estimated_bpm || 120;
            const intensityScore = analysis?.intensity_score || 0.5;
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
        enrichedTracks.push({
            videoId: track.videoId,
            title: track.title,
            artist: track.artist,
            estimatedBpm: dbTrack.estimatedBpm,
            intensityScore: dbTrack.intensityScore,
            originalIndex: track.originalIndex,
        });
    }
    return { rawTracks, enrichedTracks };
}
/**
 * Controller Endpoint for Mental Drift Engine (POST /api/playlists/:id/drift)
 */
const driftRearrange = async (req, res) => {
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ error: 'Playlist ID is required' });
    try {
        const { rawTracks, enrichedTracks } = await fetchAndEnrichTracks(id);
        if (rawTracks.length === 0) {
            return res.status(404).json({ error: 'No tracks found in the playlist' });
        }
        const driftTracks = enrichedTracks.map(t => ({
            videoId: t.videoId,
            title: t.title,
            artist: t.artist,
            estimatedBpm: t.estimatedBpm,
            intensityScore: t.intensityScore,
            originalIndex: t.originalIndex,
        }));
        console.log(`[DriftController] Running Drift Algorithm on ${driftTracks.length} tracks...`);
        const { tracks: rearrangedPlaylist, harshTracks } = (0, driftAlgorithm_1.generateDriftPlaylist)(driftTracks);
        res.json({
            engine: 'DRIFT',
            message: 'Playlist rearranged successfully with Mental Drift Engine',
            originalCount: driftTracks.length,
            acceptedCount: rearrangedPlaylist.length,
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
/**
 * Controller Endpoint for Frame Engine (POST /api/playlists/:id/frame)
 */
const frameRearrange = async (req, res) => {
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ error: 'Playlist ID is required' });
    try {
        const { rawTracks, enrichedTracks } = await fetchAndEnrichTracks(id);
        if (rawTracks.length === 0) {
            return res.status(404).json({ error: 'No tracks found in the playlist' });
        }
        const frameTracks = enrichedTracks.map(t => ({
            id: t.videoId,
            title: t.title,
            artist: t.artist,
            bpm: t.estimatedBpm,
            intensity: t.intensityScore,
            valence: 0.5,
        }));
        console.log(`[FrameController] Running Frame Algorithm on ${frameTracks.length} tracks...`);
        const output = (0, frameAlgorithm_1.processFrameAlgorithm)(frameTracks);
        res.json({
            engine: 'FRAME',
            message: 'Playlist rearranged successfully with Frame Engine (3-Act Narrative)',
            originalCount: frameTracks.length,
            acceptedCount: output.acceptedTracks.length,
            rejectedCount: output.rejectedTracks.length,
            metrics: output.metrics,
            smoothnessScore: output.smoothnessScore,
            tracks: output.acceptedTracks,
            rejectedTracks: output.rejectedTracks,
        });
    }
    catch (err) {
        (0, errorHandler_1.handleControllerError)(res, err, '[FrameController] Error during frame rearrangement');
    }
};
exports.frameRearrange = frameRearrange;
/**
 * Controller Endpoint for Unhinged Engine (POST /api/playlists/:id/unhinged)
 */
const unhingedRearrange = async (req, res) => {
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ error: 'Playlist ID is required' });
    try {
        const { rawTracks, enrichedTracks } = await fetchAndEnrichTracks(id);
        if (rawTracks.length === 0) {
            return res.status(404).json({ error: 'No tracks found in the playlist' });
        }
        const unhingedTracks = enrichedTracks.map(t => ({
            id: t.videoId,
            title: t.title,
            artist: t.artist,
            bpm: t.estimatedBpm,
            arousal: t.intensityScore,
            intensity: t.intensityScore,
            valence: 0.5,
        }));
        console.log(`[UnhingedController] Running Unhinged Algorithm on ${unhingedTracks.length} tracks...`);
        const output = (0, unhingedAlgorithm_1.processUnhingedAlgorithm)(unhingedTracks);
        res.json({
            engine: 'UNHINGED',
            message: 'Playlist rearranged successfully with Unhinged Engine (Subversive Whiplash)',
            originalCount: unhingedTracks.length,
            acceptedCount: output.sequencedTracks.length,
            rejectedCount: output.rejectedTracks.length,
            yieldRetention: output.yieldRetention,
            smoothnessScore: output.smoothnessScore,
            metrics: output.metrics,
            anchorLogs: output.anchorLogs,
            tracks: output.sequencedTracks,
            rejectedTracks: output.rejectedTracks,
        });
    }
    catch (err) {
        (0, errorHandler_1.handleControllerError)(res, err, '[UnhingedController] Error during unhinged rearrangement');
    }
};
exports.unhingedRearrange = unhingedRearrange;
