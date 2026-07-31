import { Request, Response } from 'express';
import { YtMusicService } from '../services/ytmusicService';
import { getOrAnalyzeTrack } from '../services/trackCacheService';
import { generateDriftPlaylist, DriftTrack } from '../utils/driftAlgorithm';
import { handleControllerError } from '../utils/errorHandler';

export const driftRearrange = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const ytmusicService = YtMusicService.getInstance();
    
    // 1. Fetch raw tracks from YouTube API
    const rawTracks = await ytmusicService.getPlaylistTracks(id);
    if (rawTracks.length === 0) {
      return res.status(404).json({ error: 'No tracks found in the playlist' });
    }

    const driftTracks: DriftTrack[] = [];

    // 2. Process each track via getOrAnalyzeTrack (Title + Artist caching)
    for (const track of rawTracks) {
      if (!track.videoId) continue;

      const cached = await getOrAnalyzeTrack({
        title: track.title,
        artist: track.artist,
        tags: track.tags,
        videoId: track.videoId,
      });

      driftTracks.push({
        videoId: track.videoId,
        title: cached.title,
        artist: cached.artist,
        estimatedBpm: cached.estimatedBpm,
        intensityScore: cached.intensityScore,
        originalIndex: track.originalIndex,
      });
    }

    // 3. Algorithm Sorting
    console.log(`[DriftController] Running Drift Algorithm on ${driftTracks.length} tracks...`);
    const { tracks: rearrangedPlaylist, harshTracks } = generateDriftPlaylist(driftTracks);

    res.json({
      message: 'Playlist rearranged successfully',
      originalCount: driftTracks.length,
      filteredCount: harshTracks.length,
      tracks: rearrangedPlaylist,
      harshTracks,
    });
  } catch (err: any) {
    handleControllerError(res, err, '[DriftController] Error during drift rearrangement');
  }
};
