import { Request, Response } from 'express';
import { YtMusicService } from '../services/ytmusicService';
import { getOrAnalyzeTracksBatch } from '../services/trackCacheService';
import { isDeletedOrUnavailableTrack } from '../utils/trackUtils';
import { generateDriftPlaylist, DriftTrack } from '../utils/driftAlgorithm';
import { processFrameAlgorithm, Track as FrameTrack } from '../utils/frameAlgorithm';
import { processUnhingedAlgorithm, Track as UnhingedTrack } from '../utils/unhingedAlgorithm';
import { handleControllerError } from '../utils/errorHandler';

/**
 * Helper to fetch tracks from YouTube API, analyze/enrich via Gemini AI in batch, and cache in DB by Title + Artist.
 */
async function fetchAndEnrichTracks(playlistId: string) {
  const ytmusicService = YtMusicService.getInstance();
  const rawTracks = await ytmusicService.getPlaylistTracks(playlistId);
  
  if (rawTracks.length === 0) {
    return { rawTracks: [], enrichedTracks: [] };
  }

  // Filter valid, non-deleted tracks
  const validTracks = rawTracks.filter(
    (t) => t.videoId && !isDeletedOrUnavailableTrack(t.title, t.artist, t.videoId)
  );

  if (validTracks.length === 0) {
    return { rawTracks: [], enrichedTracks: [] };
  }

  // Batch analyze / fetch from cache
  const cachedResults = await getOrAnalyzeTracksBatch(
    validTracks.map((t) => ({
      title: t.title,
      artist: t.artist,
      tags: t.tags,
      videoId: t.videoId,
    }))
  );

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
export const driftRearrange = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Playlist ID is required' });

  try {
    const { rawTracks, enrichedTracks } = await fetchAndEnrichTracks(id);
    if (rawTracks.length === 0) {
      return res.status(404).json({ error: 'No tracks found in the playlist' });
    }

    const driftTracks: DriftTrack[] = enrichedTracks.map(t => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      estimatedBpm: t.estimatedBpm,
      intensityScore: t.intensityScore,
      originalIndex: t.originalIndex,
    }));

    console.log(`[DriftController] Running Drift Algorithm on ${driftTracks.length} tracks...`);
    const { tracks: rearrangedPlaylist, harshTracks } = generateDriftPlaylist(driftTracks);

    res.json({
      engine: 'DRIFT',
      message: 'Playlist rearranged successfully with Mental Drift Engine',
      originalCount: driftTracks.length,
      acceptedCount: rearrangedPlaylist.length,
      filteredCount: harshTracks.length,
      tracks: rearrangedPlaylist,
      harshTracks,
    });
  } catch (err: any) {
    handleControllerError(res, err, '[DriftController] Error during drift rearrangement');
  }
};

/**
 * Controller Endpoint for Frame Engine (POST /api/playlists/:id/frame)
 */
export const frameRearrange = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Playlist ID is required' });

  try {
    const { rawTracks, enrichedTracks } = await fetchAndEnrichTracks(id);
    if (rawTracks.length === 0) {
      return res.status(404).json({ error: 'No tracks found in the playlist' });
    }

    const frameTracks: FrameTrack[] = enrichedTracks.map(t => ({
      id: t.videoId,
      title: t.title,
      artist: t.artist,
      bpm: t.estimatedBpm,
      intensity: t.intensityScore,
      valence: 0.5,
    }));

    console.log(`[FrameController] Running Frame Algorithm on ${frameTracks.length} tracks...`);
    const output = processFrameAlgorithm(frameTracks);

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
  } catch (err: any) {
    handleControllerError(res, err, '[FrameController] Error during frame rearrangement');
  }
};

/**
 * Controller Endpoint for Unhinged Engine (POST /api/playlists/:id/unhinged)
 */
export const unhingedRearrange = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Playlist ID is required' });

  try {
    const { rawTracks, enrichedTracks } = await fetchAndEnrichTracks(id);
    if (rawTracks.length === 0) {
      return res.status(404).json({ error: 'No tracks found in the playlist' });
    }

    const unhingedTracks: Partial<UnhingedTrack>[] = enrichedTracks.map(t => ({
      id: t.videoId,
      title: t.title,
      artist: t.artist,
      bpm: t.estimatedBpm,
      arousal: t.intensityScore,
      intensity: t.intensityScore,
      valence: 0.5,
    }));

    console.log(`[UnhingedController] Running Unhinged Algorithm on ${unhingedTracks.length} tracks...`);
    const output = processUnhingedAlgorithm(unhingedTracks);

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
  } catch (err: any) {
    handleControllerError(res, err, '[UnhingedController] Error during unhinged rearrangement');
  }
};
