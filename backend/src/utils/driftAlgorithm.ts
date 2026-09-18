/**
 * Mental Drift Algorithm (v2.1 Ultra-Smooth)
 * 
 * Rearranges a YouTube Music playlist based on a multi-feature distance metric, 
 * look-ahead forward connectivity, and 2-opt trajectory smoothing for maximum flow.
 */

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
 * Calculates normalized distance between two tracks considering both BPM and Sonic Intensity.
 */
function calculateTrackDistance(a: DriftTrack, b: DriftTrack): number {
  const normalizedBpmDelta = Math.abs(a.estimatedBpm - b.estimatedBpm) / 30;
  const intensityDelta = Math.abs(a.intensityScore - b.intensityScore);
  return 0.5 * normalizedBpmDelta + 0.5 * intensityDelta;
}

/**
 * 2-Opt Post-Processing Optimization Pass:
 * Swaps elements in the output sequence to eliminate any remaining localized energy drops or spikes.
 */
function optimizeSequenceFlow(tracks: DriftTrack[]): DriftTrack[] {
  if (tracks.length <= 3) return tracks;

  const result = [...tracks];
  let improved = true;
  let passes = 0;
  const MAX_PASSES = 5;

  while (improved && passes < MAX_PASSES) {
    improved = false;
    passes++;

    for (let i = 0; i < result.length - 2; i++) {
      for (let j = i + 1; j < result.length - 1; j++) {
        // Calculate cost of current arrangement at boundaries i and j
        const currentCost = 
          calculateTrackDistance(result[i], result[i + 1]) +
          calculateTrackDistance(result[j], result[j + 1]);

        // Calculate cost if segment between i+1 and j is reversed
        const newCost = 
          calculateTrackDistance(result[i], result[j]) +
          calculateTrackDistance(result[i + 1], result[j + 1]);

        // If reversing the subsegment produces a smoother transition flow, swap
        if (newCost < currentCost - 0.02) {
          // Reverse subsegment from i+1 to j using clean array destructuring
          let left = i + 1;
          let right = j;
          while (left < right) {
            [result[left], result[right]] = [result[right], result[left]];
            left++;
            right--;
          }
          improved = true;
        }
      }
    }
  }

  return result;
}

/**
 * Executes the Ultra-Smooth Mental Drift algorithm to rearrange a raw list of tracks.
 * 
 * @param rawTracks The raw, unsorted playlist dataset
 * @returns An object containing the optimized playlist and any rejected harsh tracks
 */
/** The classic Drift zone: mid-tempo, low-intensity. */
export const CANONICAL_DRIFT_GATE = {
  lowerBpm: 104,
  upperBpm: 136,
  maxIntensity: 0.65,
} as const;

/**
 * Drift aims to keep roughly this share of a playlist. Below it, the canonical
 * window is judged a poor fit for this particular music and is re-centred.
 */
const MIN_RETENTION = 0.5;
/** Never re-centre on so few tracks that the percentiles are meaningless. */
const MIN_POOL_FOR_ADAPTIVE = 6;

export interface DriftGate {
  lowerBpm: number;
  upperBpm: number;
  maxIntensity: number;
  /** True when the window was re-centred on the playlist's own distribution. */
  adaptive: boolean;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[idx];
}

/**
 * Picks the vibe gate for a playlist: the canonical window when it fits, or one
 * derived from the playlist's own tempo and intensity spread when it does not.
 */
export function resolveDriftGate(tracks: DriftTrack[]): DriftGate {
  const canonical: DriftGate = { ...CANONICAL_DRIFT_GATE, adaptive: false };
  if (tracks.length === 0) return canonical;

  const passesCanonical = tracks.filter(
    (t) =>
      t.intensityScore <= canonical.maxIntensity &&
      t.estimatedBpm >= canonical.lowerBpm &&
      t.estimatedBpm <= canonical.upperBpm
  ).length;

  // The canonical window suits this playlist — keep the established behaviour.
  if (passesCanonical / tracks.length >= MIN_RETENTION) return canonical;
  if (tracks.length < MIN_POOL_FOR_ADAPTIVE) {
    // Too small to infer a distribution; widening arbitrarily would be guessing.
    return canonical;
  }

  const bpms = tracks.map((t) => t.estimatedBpm).sort((a, b) => a - b);
  const intensities = tracks.map((t) => t.intensityScore).sort((a, b) => a - b);

  // Centre on the playlist's tempo mass, keeping a window of comparable width to
  // the canonical 32 BPM so transitions stay gentle.
  const medianBpm = percentile(bpms, 0.5);
  const spread = Math.max(16, (percentile(bpms, 0.75) - percentile(bpms, 0.25)) * 1.5);

  // Drift stays biased toward the calmer end of whatever it is given, rather
  // than simply accepting everything.
  const intensityCeiling = Math.max(
    percentile(intensities, 0.6),
    Math.min(canonical.maxIntensity, percentile(intensities, 0.5) + 0.1)
  );

  return {
    lowerBpm: Math.max(40, medianBpm - spread),
    upperBpm: Math.min(220, medianBpm + spread),
    maxIntensity: Math.min(1, Number(intensityCeiling.toFixed(2))),
    adaptive: true,
  };
}

export function generateDriftPlaylist(rawTracks: DriftTrack[]): DriftResult {
  if (!rawTracks || rawTracks.length === 0) {
    return { tracks: [], harshTracks: [] };
  }

  // 1. Vibe Gate
  //
  // The principle is unchanged: Drift keeps the calm, steady core of a playlist
  // and rejects the tracks that would break the trance. What changed is where
  // that boundary sits.
  //
  // The canonical window below describes the classic Drift zone. Applied as an
  // absolute rule it discarded entire genres: a lo-fi study playlist (70-92 BPM)
  // and a metal playlist (140-180 BPM) both scored 0% retention, and lo-fi is
  // precisely what Drift is advertised for. When the canonical window keeps too
  // little of a playlist, the gate re-centres on that playlist's own
  // distribution, so "drift" means the smoothest run through *your* music
  // rather than the subset that happens to sit at 104-136 BPM.
  const gate = resolveDriftGate(rawTracks);

  const isHarsh = (track: DriftTrack) =>
    track.intensityScore > gate.maxIntensity ||
    track.estimatedBpm < gate.lowerBpm ||
    track.estimatedBpm > gate.upperBpm;

  const filteredPool = rawTracks.filter((track) => !isHarsh(track));
  const harshTracks = rawTracks.filter(isHarsh);

  if (filteredPool.length === 0) {
    return { tracks: [], harshTracks };
  }

  // 2. Starter Seed Selection
  const sortedByBpm = [...filteredPool].sort((a, b) => a.estimatedBpm - b.estimatedBpm);
  const mid = Math.floor(sortedByBpm.length / 2);
  const medianBpm = sortedByBpm.length % 2 === 0
    ? (sortedByBpm[mid - 1].estimatedBpm + sortedByBpm[mid].estimatedBpm) / 2
    : sortedByBpm[mid].estimatedBpm;

  const { seedIndex } = filteredPool.reduce(
    (best, track, i) => {
      const bpmDiff = Math.abs(track.estimatedBpm - medianBpm) / 30;
      const intensityDiff = Math.abs(track.intensityScore - 0.25);
      const score = bpmDiff + intensityDiff;
      return score < best.minScore ? { seedIndex: i, minScore: score } : best;
    },
    { seedIndex: 0, minScore: Infinity }
  );

  const playlist: DriftTrack[] = [];
  const seedTrack = filteredPool.splice(seedIndex, 1)[0];
  playlist.push(seedTrack);

  // 3. Momentum & Look-Ahead Nearest-Neighbor Construction
  const historyQueue: DriftTrack[] = [seedTrack];

  while (filteredPool.length > 0) {
    const currentTrack = playlist[playlist.length - 1];

    let trend = 0;
    if (historyQueue.length >= 3) {
      const firstIntensity = historyQueue[0].intensityScore;
      const thirdIntensity = historyQueue[2].intensityScore;
      if (thirdIntensity > firstIntensity + 0.05) trend = 1;
      else if (thirdIntensity < firstIntensity - 0.05) trend = -1;
    }

    let bestCandidateIndex = -1;
    let lowestScore = Infinity;

    for (let i = 0; i < filteredPool.length; i++) {
      const candidate = filteredPool[i];
      let score = calculateTrackDistance(currentTrack, candidate);

      if (trend === 1 && candidate.intensityScore > currentTrack.intensityScore + 0.15) {
        score += 0.20;
      } else if (trend === -1 && candidate.intensityScore < currentTrack.intensityScore - 0.15) {
        score += 0.20;
      }

      if (filteredPool.length > 2) {
        let minNextDist = Infinity;
        for (let j = 0; j < filteredPool.length; j++) {
          if (i === j) continue;
          const dist = calculateTrackDistance(candidate, filteredPool[j]);
          if (dist < minNextDist) minNextDist = dist;
        }
        score += minNextDist * 0.25;
      }

      if (score < lowestScore) {
        lowestScore = score;
        bestCandidateIndex = i;
      }
    }

    if (bestCandidateIndex === -1) bestCandidateIndex = 0;

    const nextTrack = filteredPool.splice(bestCandidateIndex, 1)[0];
    playlist.push(nextTrack);

    historyQueue.push(nextTrack);
    if (historyQueue.length > 3) historyQueue.shift();
  }

  // 4. Post-Processing 2-Opt Sequence Flow Optimization
  const optimizedPlaylist = optimizeSequenceFlow(playlist);

  return { tracks: optimizedPlaylist, harshTracks };
}
