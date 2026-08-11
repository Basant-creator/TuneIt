import prisma from '../config/db';
import { analyzeTrackMetadata, analyzeBatchTrackMetadata, BatchTrackItem, AIAnalysisResult } from './aiService';
import { isDeletedOrUnavailableTrack, estimateTrackHeuristics } from '../utils/trackUtils';
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
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
export function normalizeTrackKey(artist: string, title: string): string {
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

export interface GetOrAnalyzeTrackParams {
  title: string;
  artist: string;
  tags?: string[];
  videoId?: string;
}

export interface CachedTrackResult {
  trackKey: string;
  videoId?: string;
  title: string;
  artist: string;
  estimatedBpm: number;
  intensityScore: number;
}

/**
 * Batch retrieves track features from DB by composite keys.
 * For any CACHE MISS, groups unanalyzed tracks into batches of 12 and requests AI analysis
 * in a single Gemini call per batch. If API quota is reached or fails, uses smart heuristic analysis.
 */
export async function getOrAnalyzeTracksBatch(
  paramsList: GetOrAnalyzeTrackParams[]
): Promise<CachedTrackResult[]> {
  if (paramsList.length === 0) return [];

  // Map each param to its trackKey and handle deleted/unavailable tracks early
  const trackMap = paramsList.map((p, originalIdx) => {
    const isDeleted = isDeletedOrUnavailableTrack(p.title, p.artist, p.videoId);
    const trackKey = normalizeTrackKey(p.artist, p.title);
    return {
      params: p,
      trackKey,
      isDeleted,
      originalIdx,
    };
  });

  // Collect unique non-deleted keys to query from Database
  const validTrackKeys = Array.from(
    new Set(trackMap.filter((item) => !item.isDeleted).map((item) => item.trackKey))
  );

  // 1. Batch query DB for cached tracks
  const dbTracks = await prisma.youtubeTrack.findMany({
    where: { trackKey: { in: validTrackKeys } },
  });

  const dbMap = new Map<string, (typeof dbTracks)[0]>();
  for (const track of dbTracks) {
    dbMap.set(track.trackKey, track);
  }

  // Identify Cache Hits vs Cache Misses
  const cacheHitsCount = dbTracks.length;
  console.log(`[TrackCacheService] Batch Check: ${cacheHitsCount} CACHE HITS out of ${paramsList.length} tracks.`);

  // Find unique missing tracks that need analysis
  const missingTrackMap = new Map<string, GetOrAnalyzeTrackParams>();
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
      const batchPayload: BatchTrackItem[] = chunk.map(([_, p], idx) => ({
        index: idx,
        title: p.title,
        artist: p.artist,
        tags: p.tags || [],
      }));

      let aiResultsMap: Map<number, AIAnalysisResult>;
      try {
        aiResultsMap = await limiter.schedule(() => analyzeBatchTrackMetadata(batchPayload));
      } catch {
        aiResultsMap = new Map();
      }

      // Upsert new tracks into DB
      for (let idx = 0; idx < chunk.length; idx++) {
        const [key, p] = chunk[idx];
        const aiRes = aiResultsMap.get(idx);

        let bpm: number;
        let intensity: number;

        if (aiRes) {
          bpm = aiRes.estimated_bpm;
          intensity = aiRes.intensity_score;
        } else {
          // Heuristic fallback if AI failed or 429 quota hit
          const heuristic = estimateTrackHeuristics(p.title, p.artist, p.tags);
          bpm = heuristic.estimated_bpm;
          intensity = heuristic.intensity_score;
        }

        try {
          const savedTrack = await prisma.youtubeTrack.upsert({
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
        } catch (dbErr) {
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

    const heuristic = estimateTrackHeuristics(item.params.title, item.params.artist, item.params.tags);
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
export async function getOrAnalyzeTrack(params: GetOrAnalyzeTrackParams): Promise<CachedTrackResult> {
  const results = await getOrAnalyzeTracksBatch([params]);
  return results[0];
}
