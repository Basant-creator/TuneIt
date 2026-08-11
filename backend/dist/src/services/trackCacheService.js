"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTrackKey = normalizeTrackKey;
exports.getOrAnalyzeTracksBatch = getOrAnalyzeTracksBatch;
exports.getOrAnalyzeTrack = getOrAnalyzeTrack;
const db_1 = __importDefault(require("../config/db"));
const aiService_1 = require("./aiService");
const trackUtils_1 = require("../utils/trackUtils");
const bottleneck_1 = __importDefault(require("bottleneck"));
const limiter = new bottleneck_1.default({
    reservoir: 14,
    reservoirRefreshAmount: 14,
    reservoirRefreshInterval: 60000,
    maxConcurrent: 1,
    minTime: 1000,
});
/**
 * Normalizes artist and title into a deterministic trackKey.
 * E.g., "Eric Prydz" + "Opus - Original Mix" -> "eric prydz:::opus"
 */
function normalizeTrackKey(artist, title) {
    const cleanArtist = (artist || '')
        .toLowerCase()
        .replace(/ - topic$/i, '')
        .replace(/vevo$/i, '')
        .trim();
    const cleanTitle = (title || '')
        .toLowerCase()
        .replace(/\s*[\(\[\{](official|hd|4k|lyric|audio|video|visualizer).*?[\)\]\}]/gi, '')
        .trim();
    return `${cleanArtist}:::${cleanTitle}`;
}
/**
 * Batch retrieves track features from DB by composite keys.
 * For any CACHE MISS, groups unanalyzed tracks into batches of 12 and requests AI analysis
 * in a single Gemini call per batch. If API quota is reached or fails, uses smart heuristic analysis.
 */
async function getOrAnalyzeTracksBatch(paramsList) {
    if (paramsList.length === 0)
        return [];
    // Map each param to its trackKey and handle deleted/unavailable tracks early
    const trackMap = paramsList.map((p, originalIdx) => {
        const isDeleted = (0, trackUtils_1.isDeletedOrUnavailableTrack)(p.title, p.artist, p.videoId);
        const trackKey = normalizeTrackKey(p.artist, p.title);
        return {
            params: p,
            trackKey,
            isDeleted,
            originalIdx,
        };
    });
    // Collect unique non-deleted keys to query from Database
    const validTrackKeys = Array.from(new Set(trackMap.filter((item) => !item.isDeleted).map((item) => item.trackKey)));
    // 1. Batch query DB for cached tracks
    const dbTracks = await db_1.default.youtubeTrack.findMany({
        where: { trackKey: { in: validTrackKeys } },
    });
    const dbMap = new Map();
    for (const track of dbTracks) {
        dbMap.set(track.trackKey, track);
    }
    // Identify Cache Hits vs Cache Misses
    const cacheHitsCount = dbTracks.length;
    console.log(`[TrackCacheService] Batch Check: ${cacheHitsCount} CACHE HITS out of ${paramsList.length} tracks.`);
    // Find unique missing tracks that need analysis
    const missingTrackMap = new Map();
    for (const item of trackMap) {
        if (!item.isDeleted && !dbMap.has(item.trackKey)) {
            if (!missingTrackMap.has(item.trackKey)) {
                missingTrackMap.set(item.trackKey, item.params);
            }
        }
    }
    const missingList = Array.from(missingTrackMap.entries());
    if (missingList.length > 0) {
        console.log(`[TrackCacheService] ${missingList.length} CACHE MISSES found. Batch analyzing with Gemini AI...`);
        // Group missing tracks into batches of 12 for single-prompt Gemini API calls
        const BATCH_SIZE = 12;
        for (let i = 0; i < missingList.length; i += BATCH_SIZE) {
            const chunk = missingList.slice(i, i + BATCH_SIZE);
            const batchPayload = chunk.map(([_, p], idx) => ({
                index: idx,
                title: p.title,
                artist: p.artist,
                tags: p.tags || [],
            }));
            let aiResultsMap;
            try {
                aiResultsMap = await limiter.schedule(() => (0, aiService_1.analyzeBatchTrackMetadata)(batchPayload));
            }
            catch {
                aiResultsMap = new Map();
            }
            // Upsert new tracks into DB
            for (let idx = 0; idx < chunk.length; idx++) {
                const [key, p] = chunk[idx];
                const aiRes = aiResultsMap.get(idx);
                let bpm;
                let intensity;
                if (aiRes) {
                    bpm = aiRes.estimated_bpm;
                    intensity = aiRes.intensity_score;
                }
                else {
                    // Heuristic fallback if AI failed or 429 quota hit
                    const heuristic = (0, trackUtils_1.estimateTrackHeuristics)(p.title, p.artist, p.tags);
                    bpm = heuristic.estimated_bpm;
                    intensity = heuristic.intensity_score;
                }
                try {
                    const savedTrack = await db_1.default.youtubeTrack.upsert({
                        where: { trackKey: key },
                        create: {
                            trackKey: key,
                            videoId: p.videoId || null,
                            title: p.title.substring(0, 255),
                            artist: p.artist.substring(0, 255),
                            estimatedBpm: bpm,
                            intensityScore: intensity,
                        },
                        update: {
                            videoId: p.videoId || null,
                            estimatedBpm: bpm,
                            intensityScore: intensity,
                            title: p.title.substring(0, 255),
                            artist: p.artist.substring(0, 255),
                            lastUpdated: new Date(),
                        },
                    });
                    dbMap.set(key, savedTrack);
                }
                catch (dbErr) {
                    console.error(`[TrackCacheService] Error saving track "${p.title}" to DB:`, dbErr);
                }
            }
        }
    }
    // Construct final result array maintaining exact input order
    return trackMap.map((item) => {
        if (item.isDeleted) {
            return {
                trackKey: item.trackKey,
                videoId: item.params.videoId,
                title: item.params.title,
                artist: item.params.artist,
                estimatedBpm: 120,
                intensityScore: 0.5,
            };
        }
        const cached = dbMap.get(item.trackKey);
        if (cached) {
            return {
                trackKey: cached.trackKey,
                videoId: cached.videoId || item.params.videoId,
                title: cached.title,
                artist: cached.artist,
                estimatedBpm: cached.estimatedBpm,
                intensityScore: cached.intensityScore,
            };
        }
        const heuristic = (0, trackUtils_1.estimateTrackHeuristics)(item.params.title, item.params.artist, item.params.tags);
        return {
            trackKey: item.trackKey,
            videoId: item.params.videoId,
            title: item.params.title,
            artist: item.params.artist,
            estimatedBpm: heuristic.estimated_bpm,
            intensityScore: heuristic.intensity_score,
        };
    });
}
/**
 * Single-track wrapper around getOrAnalyzeTracksBatch for backward compatibility.
 */
async function getOrAnalyzeTrack(params) {
    const results = await getOrAnalyzeTracksBatch([params]);
    return results[0];
}
