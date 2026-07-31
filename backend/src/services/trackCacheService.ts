import prisma from '../config/db';
import { analyzeTrackMetadata } from './aiService';
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
 * Retrieves track features from DB by normalized Title + Artist.
 * On Cache Miss, invokes Gemini Tier 1 analysis, saves to DB, and returns features.
 */
export async function getOrAnalyzeTrack(params: GetOrAnalyzeTrackParams): Promise<CachedTrackResult> {
  const trackKey = normalizeTrackKey(params.artist, params.title);

  // 1. Check Database Cache by Title + Artist composite key
  let dbTrack = await prisma.youtubeTrack.findUnique({
    where: { trackKey },
  });

  const isDefaultFallback = dbTrack && dbTrack.estimatedBpm === 120 && dbTrack.intensityScore === 0.5;

  if (!dbTrack || isDefaultFallback) {
    console.log(`[TrackCacheService] CACHE MISS: Analyzing "${params.title}" by "${params.artist}" with Gemini AI...`);

    const analysis = await limiter.schedule(() =>
      analyzeTrackMetadata({
        title: params.title,
        artist: params.artist,
        tags: params.tags || [],
      })
    );

    const estimatedBpm = analysis?.estimated_bpm || 120;
    const intensityScore = analysis?.intensity_score || 0.5;

    dbTrack = await prisma.youtubeTrack.upsert({
      where: { trackKey },
      create: {
        trackKey,
        videoId: params.videoId || null,
        title: params.title.substring(0, 255),
        artist: params.artist.substring(0, 255),
        estimatedBpm,
        intensityScore,
      },
      update: {
        videoId: params.videoId || dbTrack?.videoId || null,
        estimatedBpm,
        intensityScore,
        title: params.title.substring(0, 255),
        artist: params.artist.substring(0, 255),
        lastUpdated: new Date(),
      },
    });
  } else {
    console.log(`[TrackCacheService] CACHE HIT: Found "${params.title}" by "${params.artist}" (BPM: ${dbTrack.estimatedBpm}, Int: ${dbTrack.intensityScore})`);
  }

  return {
    trackKey: dbTrack.trackKey,
    videoId: dbTrack.videoId || params.videoId,
    title: dbTrack.title,
    artist: dbTrack.artist,
    estimatedBpm: dbTrack.estimatedBpm,
    intensityScore: dbTrack.intensityScore,
  };
}
