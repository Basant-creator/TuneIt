import { Request, Response } from 'express';
import { YtMusicService } from '../services/ytmusicService';
import { analyzeTrackMetadata } from '../services/aiService';
import { generateDriftPlaylist, DriftTrack } from '../utils/driftAlgorithm';
import { handleControllerError } from '../utils/errorHandler';
import prisma from '../config/db';
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  reservoir: 14, // 14 tokens
  reservoirRefreshAmount: 14,
  reservoirRefreshInterval: 60000, // every 60 seconds
  maxConcurrent: 1,
  minTime: 1000, // 1 second minimum between requests
});

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

    // 2. Process each track
    for (const track of rawTracks) {
      if (!track.videoId) continue;

      // Check cache first
      let dbTrack = await prisma.youtubeTrack.findUnique({
        where: { videoId: track.videoId },
      });

      const isDefaultFallback = dbTrack && dbTrack.estimatedBpm === 120 && dbTrack.intensityScore === 0.5;

      if (!dbTrack || isDefaultFallback) {
        // Run AI Analysis
        console.log(`[DriftController] Analyzing ${track.title} with Gemini AI...`);
        
        const analysis = await limiter.schedule(() =>
          analyzeTrackMetadata({
            title: track.title,
            artist: track.artist,
            tags: track.tags,
          })
        );

        const estimatedBpm = analysis?.estimated_bpm || 120; // Default fallback
        const intensityScore = analysis?.intensity_score || 0.5;

        // Save to DB
        if (!dbTrack) {
          dbTrack = await prisma.youtubeTrack.create({
            data: {
              videoId: track.videoId,
              title: track.title.substring(0, 255),
              artist: track.artist.substring(0, 255),
              estimatedBpm,
              intensityScore,
            },
          });
        } else {
          // Update the existing corrupted/fallback record
          dbTrack = await prisma.youtubeTrack.update({
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
