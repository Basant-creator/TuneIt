import { Request, Response } from 'express';
import { YtMusicService } from '../services/ytmusicService';
import { analyzeTrackMetadata } from '../services/aiService';
import { generateDriftPlaylist, DriftTrack } from '../utils/driftAlgorithm';
import prisma from '../config/db';

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
        where: { videoId: track.videoId }
      });

      if (!dbTrack) {
        // Run AI Analysis
        console.log(`[DriftController] Analyzing ${track.title} with Gemini AI...`);
        const analysis = await analyzeTrackMetadata({
          title: track.title,
          artist: track.artist,
          tags: track.tags
        });

        const estimatedBpm = analysis?.estimated_bpm || 120; // Default fallback
        const intensityScore = analysis?.intensity_score || 0.5;

        // Save to DB
        dbTrack = await prisma.youtubeTrack.create({
          data: {
            videoId: track.videoId,
            title: track.title.substring(0, 255), // truncate if necessary
            artist: track.artist.substring(0, 255),
            estimatedBpm,
            intensityScore
          }
        });
      }

      driftTracks.push({
        videoId: track.videoId,
        title: track.title,
        artist: track.artist,
        estimatedBpm: dbTrack.estimatedBpm,
        intensityScore: dbTrack.intensityScore,
        originalIndex: track.originalIndex
      });
    }

    // 3. Algorithm Sorting
    console.log(`[DriftController] Running Drift Algorithm on ${driftTracks.length} tracks...`);
    const rearrangedPlaylist = generateDriftPlaylist(driftTracks);

    res.json({
      message: 'Playlist rearranged successfully',
      originalCount: driftTracks.length,
      filteredCount: driftTracks.length - rearrangedPlaylist.length,
      tracks: rearrangedPlaylist
    });

  } catch (err: any) {
    console.error('[DriftController] Error during drift rearrangement:', err?.message || err);
    res.status(500).json({
      error: 'Failed to apply Drift algorithm',
      details: err?.message || err
    });
  }
};
