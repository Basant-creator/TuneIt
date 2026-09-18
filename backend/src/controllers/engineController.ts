import { Request, Response } from 'express';
import { getOrAnalyzeTracksBatch } from '../services/trackCacheService';
import { isDeletedOrUnavailableTrack } from '../utils/trackUtils';
import {
  runFlowEngine,
  isFlowMode,
  MODE_BY_SLUG,
  SUPPORTED_MODES,
  EnrichedTrack,
  FlowMode,
} from '../services/flowEngineService';
import { handleControllerError } from '../utils/errorHandler';

/**
 * Fetches tracks from the YouTube API, enriches them via Gemini AI (batched,
 * DB-cached by Title + Artist) and returns them in playlist order.
 */
async function fetchAndEnrichTracks(req: Request, playlistId: string): Promise<EnrichedTrack[]> {
  const ytmusicService = req.ytmusic!;
  const rawTracks = await ytmusicService.getPlaylistTracks(playlistId);

  if (rawTracks.length === 0) return [];

  const validTracks = rawTracks.filter(
    (t) => t.videoId && !isDeletedOrUnavailableTrack(t.title, t.artist, t.videoId)
  );
  if (validTracks.length === 0) return [];

  const cachedResults = await getOrAnalyzeTracksBatch(
    validTracks.map((t) => ({
      title: t.title,
      artist: t.artist,
      tags: t.tags,
      videoId: t.videoId,
    }))
  );

  return validTracks.map((track, idx) => {
    const cached = cachedResults[idx];
    return {
      videoId: track.videoId,
      title: cached?.title || track.title,
      artist: cached?.artist || track.artist,
      estimatedBpm: cached?.estimatedBpm || 120,
      intensityScore: cached?.intensityScore ?? 0.5,
      valence: cached?.valence,
      camelotKey: cached?.camelotKey,
      originalIndex: track.originalIndex,
    };
  });
}

/**
 * Shared handler behind every rearrangement endpoint.
 */
async function handleRearrange(req: Request, res: Response, mode: FlowMode) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Playlist ID is required' });

  try {
    const enriched = await fetchAndEnrichTracks(req, id);
    if (enriched.length === 0) {
      return res.status(404).json({ error: 'No playable tracks found in this playlist' });
    }

    const startedAt = Date.now();
    const result = runFlowEngine(mode, enriched);
    const durationMs = Date.now() - startedAt;

    // An engine that filters out every track would render as a blank list.
    // Say so explicitly instead.
    if (result.acceptedCount === 0) {
      return res.status(422).json({
        error:
          `The ${result.label} engine could not build a sequence from this playlist — ` +
          'every track fell outside its vibe profile. Try a different flow mode.',
        code: 'NO_TRACKS_RETAINED',
        engine: result.engine,
        mode,
        originalCount: result.originalCount,
        harshTracks: result.harshTracks,
      });
    }

    console.log(
      `[EngineController] ${result.engine} sequenced ${result.acceptedCount}/${result.originalCount} ` +
        `tracks in ${durationMs}ms (smoothness ${result.smoothnessScore})`
    );

    return res.json({ ...result, durationMs });
  } catch (err: any) {
    return handleControllerError(res, err, `[EngineController] Error running ${mode} engine`);
  }
}

/**
 * Mode-agnostic endpoint: POST /api/playlists/:id/rearrange  body { mode }
 * This is what the frontend uses; the per-engine routes below stay for
 * backwards compatibility and direct API use.
 */
export const rearrangePlaylist = async (req: Request, res: Response) => {
  const mode = req.body?.mode ?? req.query?.mode;

  if (!isFlowMode(mode)) {
    return res.status(400).json({
      error: `Unknown flow mode "${mode}". Supported modes: ${SUPPORTED_MODES.join(', ')}.`,
      supportedModes: SUPPORTED_MODES,
    });
  }

  return handleRearrange(req, res, mode);
};

/** Builds a handler for a named legacy route such as /drift or /rise. */
function legacyHandler(slug: keyof typeof MODE_BY_SLUG) {
  return (req: Request, res: Response) => handleRearrange(req, res, MODE_BY_SLUG[slug]);
}

export const riseRearrange = legacyHandler('rise');
export const driftRearrange = legacyHandler('drift');
export const frameRearrange = legacyHandler('frame');
export const unhingedRearrange = legacyHandler('unhinged');
