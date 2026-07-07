/**
 * Mental Drift Algorithm
 * 
 * This module rearranges a YouTube Music playlist based on a specialized algorithm 
 * optimized for a "Mental Drift" late-night wave experience.
 */

// 1. Data Interfaces
export interface DriftTrack {
  videoId: string;
  title: string;
  artist: string;
  estimatedBpm: number;
  intensityScore: number;
  originalIndex: number;
}

export interface DriftResult {
  /** The optimally arranged tracks for the mental drift experience */
  tracks: DriftTrack[];
  /** Tracks that were rejected by the hard vibe gate */
  harshTracks: DriftTrack[];
}

/**
 * Executes the Mental Drift algorithm to rearrange a raw list of tracks.
 * 
 * @param rawTracks The raw, unsorted playlist dataset
 * @returns An object containing the optimized playlist and the rejected harsh tracks
 */
export function generateDriftPlaylist(rawTracks: DriftTrack[]): DriftResult {
  // Input validation
  if (!rawTracks || rawTracks.length === 0) {
    return { tracks: [], harshTracks: [] };
  }

  // 2. Hard Vibe Gate
  // The golden drift pocket boundary: 104 BPM to 136 BPM
  const LOWER_BPM_BOUND = 104;
  const UPPER_BPM_BOUND = 136;
  const MAX_INTENSITY = 0.65;

  const filteredPool: DriftTrack[] = [];
  const harshTracks: DriftTrack[] = [];

  for (const track of rawTracks) {
    // Instantly remove outliers
    if (
      track.intensityScore > MAX_INTENSITY ||
      track.estimatedBpm < LOWER_BPM_BOUND ||
      track.estimatedBpm > UPPER_BPM_BOUND
    ) {
      harshTracks.push(track);
    } else {
      filteredPool.push(track);
    }
  }

  // Edge case: all tracks were rejected by the gate
  if (filteredPool.length === 0) {
    return { tracks: [], harshTracks };
  }

  // 3. Seeding Logic
  // Calculate the exact median BPM of the filtered pool
  const sortedByBpm = [...filteredPool].sort((a, b) => a.estimatedBpm - b.estimatedBpm);
  let medianBpm = 0;
  const mid = Math.floor(sortedByBpm.length / 2);
  
  if (sortedByBpm.length % 2 === 0) {
    medianBpm = (sortedByBpm[mid - 1].estimatedBpm + sortedByBpm[mid].estimatedBpm) / 2;
  } else {
    medianBpm = sortedByBpm[mid].estimatedBpm;
  }

  // Extract the track closest to the median BPM midpoint baseline
  let seedIndex = 0;
  let minBpmDiff = Infinity;
  
  for (let i = 0; i < filteredPool.length; i++) {
    const diff = Math.abs(filteredPool[i].estimatedBpm - medianBpm);
    if (diff < minBpmDiff) {
      minBpmDiff = diff;
      seedIndex = i;
    }
  }

  // Initialize output array with the starter seed (index [0])
  const playlist: DriftTrack[] = [];
  const seedTrack = filteredPool.splice(seedIndex, 1)[0];
  playlist.push(seedTrack);

  // 4. Momentum Tracking
  // Maintain a dynamic sliding history queue array tracking exactly the last 3 tracks
  const historyQueue: DriftTrack[] = [seedTrack];

  // 6. Nearest-Neighbor Execution
  // Loop through the pool using a while constraint block
  while (filteredPool.length > 0) {
    const currentTrack = playlist[playlist.length - 1];

    // Compute macro-trajectory vector (momentum trend)
    let trend = 0;
    if (historyQueue.length === 3) {
      const firstInQueue = historyQueue[0].estimatedBpm;
      const thirdInQueue = historyQueue[2].estimatedBpm;
      
      // +1 if 3rd track is faster than 1st, -1 if slower, 0 if perfectly flat
      if (thirdInQueue > firstInQueue) {
        trend = 1;
      } else if (thirdInQueue < firstInQueue) {
        trend = -1;
      }
    }

    let bestCandidateIndex = -1;
    let lowestAdjustedScore = Infinity;

    // Evaluate every song using the adaptive distance algorithm
    for (let i = 0; i < filteredPool.length; i++) {
      const candidate = filteredPool[i];
      
      // 5. Adaptive Distance Function
      // Base score is the absolute BPM delta
      const delta = Math.abs(candidate.estimatedBpm - currentTrack.estimatedBpm);
      let score = delta;

      // Adaptive penalties based on momentum trend
      if (trend === 1 && candidate.estimatedBpm > currentTrack.estimatedBpm) {
        // Trend is climbing and candidate climbs even higher
        score += delta * 2.5;
      } else if (trend === -1 && candidate.estimatedBpm < currentTrack.estimatedBpm) {
        // Trend is dropping and candidate drops lower
        score += delta * 2.5;
      }

      // Secondary tie-breaker: intensity difference + slight original index weighting for stable sorting
      const intensityDelta = Math.abs(candidate.intensityScore - currentTrack.intensityScore);
      score += intensityDelta * 0.1;

      // Extract the track with the lowest calculated adjusted score
      if (score < lowestAdjustedScore) {
        lowestAdjustedScore = score;
        bestCandidateIndex = i;
      }
    }

    // Edge case guard (should conceptually never trigger unless filteredPool is mutated)
    if (bestCandidateIndex === -1) {
      bestCandidateIndex = 0;
    }

    // Append it to the main output array
    const nextTrack = filteredPool.splice(bestCandidateIndex, 1)[0];
    playlist.push(nextTrack);
    
    // Update tracking queue
    historyQueue.push(nextTrack);
    if (historyQueue.length > 3) {
      // Shift array to maintain strictly a max of 3 elements
      historyQueue.shift();
    }
  }

  return { tracks: playlist, harshTracks };
}

