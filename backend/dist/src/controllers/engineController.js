"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unhingedRearrange = exports.frameRearrange = exports.driftRearrange = void 0;
const ytmusicService_1 = require("../services/ytmusicService");
const trackCacheService_1 = require("../services/trackCacheService");
const trackUtils_1 = require("../utils/trackUtils");
const driftAlgorithm_1 = require("../utils/driftAlgorithm");
const frameAlgorithm_1 = require("../utils/frameAlgorithm");
const unhingedAlgorithm_1 = require("../utils/unhingedAlgorithm");
const errorHandler_1 = require("../utils/errorHandler");
/**
 * Helper to fetch tracks from YouTube API, analyze/enrich via Gemini AI in batch, and cache in DB by Title + Artist.
 */
async function fetchAndEnrichTracks(playlistId) {
    const ytmusicService = ytmusicService_1.YtMusicService.getInstance();
    const rawTracks = await ytmusicService.getPlaylistTracks(playlistId);
    if (rawTracks.length === 0) {
        return { rawTracks: [], enrichedTracks: [] };
    }
    // Filter valid, non-deleted tracks
    const validTracks = rawTracks.filter((t) => t.videoId && !(0, trackUtils_1.isDeletedOrUnavailableTrack)(t.title, t.artist, t.videoId));
    if (validTracks.length === 0) {
        return { rawTracks: [], enrichedTracks: [] };
    }
    // Batch analyze / fetch from cache
    const cachedResults = await (0, trackCacheService_1.getOrAnalyzeTracksBatch)(validTracks.map((t) => ({
        title: t.title,
        artist: t.artist,
        tags: t.tags,
        videoId: t.videoId,
    })));
    const enrichedTracks = validTracks.map((track, idx) => {
        const cached = cachedResults[idx];
        return {
            videoId: track.videoId,
            title: cached?.title || track.title,
            artist: cached?.artist || track.artist,
            estimatedBpm: cached?.estimatedBpm || 120,
            intensityScore: cached?.intensityScore ?? 0.5,
            originalIndex: track.originalIndex,
        };
    });
    return { rawTracks: validTracks, enrichedTracks };
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
