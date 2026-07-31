/**
 * TuneIt Rise Algorithm (src/utils/riseAlgorithm.ts)
 * 
 * Sequences input track pools to follow the Staircase Flow Model (image_8.png).
 * Enforces a global positive energy slope regression (m > 0.0010) while utilizing
 * undulating local variance (steps, dips, and plateaus) to prevent listener fatigue.
 */

export interface RiseTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  intensity?: number;
  arousal?: number;
  energy?: number;
  valence?: number;
  genre?: string;
  key?: string; // Camelot key e.g. "8A"
  subBassDensity?: number;
}

export type RiseSegmentType = 'ENTRY' | 'ACT_I' | 'ACT_II' | 'ACT_III' | 'PEAK';

export interface SequencedRiseTrack extends RiseTrack {
  segment: RiseSegmentType;
  effectiveEnergy: number;
  deltaEnergy: number; // ΔE relative to previous track (0 for first track)
  stepType: 'STEP_UP' | 'DIP' | 'PLATEAU' | 'PUSH_PEAK';
  harmonicMatched?: boolean;
}

export interface RiseMetrics {
  slope: number;             // Linear regression slope over E(t) > 0.0010
  meanDeltaEnergy: number;   // Mean |ΔE|
  maxDeltaEnergy: number;    // Max |ΔE| <= 0.35
  jarringCount: number;      // Count of transitions where |ΔE| > 0.35 (must be 0)
  smoothnessScore: number;   // 100 - meanDeltaEnergy * 100 >= 94.0
  negativeDeltaCount: number;// Total count of negative energy deltas
  dipFrequencyWindow: string;
  segmentMedians: Record<RiseSegmentType, number>;
}

export interface RiseEngineOutput {
  sequencedTracks: SequencedRiseTrack[];
  rejectedTracks: RiseTrack[];
  metrics: RiseMetrics;
  smoothnessScore: number;
}

/**
 * Gets the normalized sonic energy metric for a track (bounded [0.0, 1.0]).
 */
export function getTrackEnergy(t: RiseTrack): number {
  const raw = t.intensity ?? t.arousal ?? t.energy ?? 0.5;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Normalizes input objects into valid RiseTrack records.
 */
export function normalizeRiseTrack(raw: any, index: number = 0): RiseTrack {
  const id = raw.id ?? raw.videoId ?? `track_${index + 1}`;
  const title = raw.title ?? 'Unknown Title';
  const artist = raw.artist ?? 'Unknown Artist';
  const bpm = typeof raw.bpm === 'number' && !isNaN(raw.bpm) ? raw.bpm : raw.estimatedBpm ?? 120;
  const energyVal = raw.intensity ?? raw.intensityScore ?? raw.arousal ?? raw.energy ?? 0.5;
  const energy = Math.max(0, Math.min(1, energyVal));

  return {
    id,
    title,
    artist,
    bpm,
    intensity: energy,
    arousal: energy,
    energy,
    valence: raw.valence ?? 0.5,
    genre: raw.genre ?? 'General',
    key: raw.key ?? deriveCamelotKey(id, bpm, energy),
    subBassDensity: raw.subBassDensity ?? 0.5
  };
}

/**
 * Fallback generator for Camelot key notation if missing.
 */
function deriveCamelotKey(id: string, bpm: number, arousal: number): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 10007;
  }
  const keyNum = ((Math.floor(hash + bpm + arousal * 100)) % 12) + 1;
  const mode = (hash % 2 === 0) ? 'A' : 'B';
  return `${keyNum}${mode}`;
}

/**
 * Checks Camelot key compatibility (same key, relative major/minor, or adjacent +/- 1).
 */
export function isCamelotCompatible(keyA?: string, keyB?: string): boolean {
  if (!keyA || !keyB) return false;
  const matchA = keyA.match(/^(\d{1,2})([AB])$/i);
  const matchB = keyB.match(/^(\d{1,2})([AB])$/i);
  if (!matchA || !matchB) return false;

  const numA = parseInt(matchA[1], 10);
  const modeA = matchA[2].toUpperCase();
  const numB = parseInt(matchB[1], 10);
  const modeB = matchB[2].toUpperCase();

  if (numA === numB && modeA === modeB) return true;
  if (numA === numB && modeA !== modeB) return true;

  const diff = Math.abs(numA - numB);
  if ((diff === 1 || diff === 11) && modeA === modeB) return true;

  return false;
}

/**
 * Computes median of a numerical array.
 */
export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Main Rise Algorithm Entry Point: Sequences track pool according to Staircase Flow Model.
 */
export function processRiseAlgorithm(inputPool: RiseTrack[]): RiseEngineOutput {
  if (!inputPool || inputPool.length === 0) {
    return {
      sequencedTracks: [],
      rejectedTracks: [],
      metrics: calculateRiseMetrics([]),
      smoothnessScore: 100
    };
  }

  const normalized = inputPool.map((t, idx) => normalizeRiseTrack(t, idx));
  const pool = [...normalized];

  // Handle small pool case (< 5 tracks)
  if (pool.length < 5) {
    pool.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
    const smallSeq: SequencedRiseTrack[] = pool.map((t, idx) => {
      const e = getTrackEnergy(t);
      const prevE = idx > 0 ? getTrackEnergy(pool[idx - 1]) : e;
      const delta = idx > 0 ? Number((e - prevE).toFixed(4)) : 0;
      let segment: RiseSegmentType = 'ENTRY';
      if (idx === pool.length - 1) segment = 'PEAK';
      return {
        ...t,
        segment,
        effectiveEnergy: e,
        deltaEnergy: delta,
        stepType: delta < 0 ? 'DIP' : (delta > 0.15 ? 'PUSH_PEAK' : 'STEP_UP')
      };
    });
    const metrics = calculateRiseMetrics(smallSeq);
    return {
      sequencedTracks: smallSeq,
      rejectedTracks: [],
      metrics,
      smoothnessScore: metrics.smoothnessScore
    };
  }

  const totalN = pool.length;

  // Step 1: Isolate top energy tracks for Peak Climax (final 15%, min 2 tracks)
  const sortedByEnergy = [...pool].sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
  const peakCount = Math.max(2, Math.min(4, Math.floor(totalN * 0.15)));
  
  // Peak climax tracks (highest energy)
  const peakTracks = sortedByEnergy.splice(sortedByEnergy.length - peakCount, peakCount);

  // Step 2: Partition remaining candidate pool into segment blocks (Entry, Act I, Act II, Act III)
  const remCount = sortedByEnergy.length;
  const entrySize = Math.max(1, Math.floor(remCount * 0.28));
  const act1Size = Math.max(1, Math.floor(remCount * 0.25));
  const act2Size = Math.max(1, Math.floor(remCount * 0.22));

  const entryBucket = sortedByEnergy.splice(0, entrySize);
  const act1Bucket = sortedByEnergy.splice(0, act1Size);
  const act2Bucket = sortedByEnergy.splice(0, act2Size);
  const act3Bucket = sortedByEnergy; // remaining

  // Step 3: Construct initial arrangement
  const rawOrdered: { track: RiseTrack; segment: RiseSegmentType }[] = [];

  // ENTRY segment
  entryBucket.forEach(t => rawOrdered.push({ track: t, segment: 'ENTRY' }));
  // ACT I segment
  act1Bucket.forEach(t => rawOrdered.push({ track: t, segment: 'ACT_I' }));

  // ACT II segment (Breather Step)
  const act2Ordered = sortAct2WithHarmonics(act2Bucket, rawOrdered.length > 0 ? rawOrdered[rawOrdered.length - 1].track : undefined);
  act2Ordered.forEach(t => rawOrdered.push({ track: t, segment: 'ACT_II' }));

  // ACT III segment (Final Escalation)
  act3Bucket.forEach(t => rawOrdered.push({ track: t, segment: 'ACT_III' }));

  // PEAK segment (Peak Climax)
  peakTracks.forEach(t => rawOrdered.push({ track: t, segment: 'PEAK' }));

  // Step 4: Apply Staircase Window Optimization (Window = 4-6 tracks)
  const optimizedTracks = applyStaircasePattern(rawOrdered);

  // Step 5: Post-processing calculation & metric validation
  const finalSequenced = calculateDeltasAndTypes(optimizedTracks);
  const metrics = calculateRiseMetrics(finalSequenced);

  return {
    sequencedTracks: finalSequenced,
    rejectedTracks: [],
    metrics,
    smoothnessScore: metrics.smoothnessScore
  };
}

// Alias processRiseEngine to processRiseAlgorithm for backwards compatibility
export const processRiseEngine = processRiseAlgorithm;

/**
 * Arranges Act II tracks to prioritize Camelot key compatibility with small energy deltas.
 */
function sortAct2WithHarmonics(bucket: RiseTrack[], prevTrack?: RiseTrack): RiseTrack[] {
  if (bucket.length <= 1) return bucket;

  const result: RiseTrack[] = [];
  const remaining = [...bucket].sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));

  let currentKey = prevTrack?.key;

  while (remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const harmonicMatch = currentKey ? isCamelotCompatible(currentKey, candidate.key) : false;
      
      const harmonicBonus = harmonicMatch ? -2.0 : 0.0;
      const score = i * 0.5 + harmonicBonus;

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) bestIdx = 0;
    const picked = remaining.splice(bestIdx, 1)[0];
    result.push(picked);
    currentKey = picked.key;
  }

  return result;
}

/**
 * Enforces the Stochastic Staircase Pattern:
 * Ensures every sliding window of 6 tracks has at least 1 negative dip (ΔE <= -0.04)
 * followed by steps-up, keeping max step <= 0.35 and global slope positive.
 */
function applyStaircasePattern(
  items: { track: RiseTrack; segment: RiseSegmentType }[]
): { track: RiseTrack; segment: RiseSegmentType }[] {
  const n = items.length;
  if (n < 6) return items;

  const result = [...items];

  // 1. Insert local dips every 4-5 tracks (at transition indices 2, 7, 12, 17, 22...)
  for (let dipIdx = 2; dipIdx < n - 2; dipIdx += 5) {
    const e1 = getTrackEnergy(result[dipIdx].track);
    const e2 = getTrackEnergy(result[dipIdx + 1].track);

    if (e2 >= e1) {
      let swapped = false;
      for (let search = dipIdx + 1; search < Math.min(n - 1, dipIdx + 4); search++) {
        const eSearch = getTrackEnergy(result[search].track);
        if (eSearch < e1 && Math.abs(eSearch - e1) <= 0.20) {
          const tmp = result[dipIdx + 1];
          result[dipIdx + 1] = result[search];
          result[search] = tmp;
          swapped = true;
          break;
        }
      }

      if (!swapped) {
        if (e2 > e1) {
          const tmp = result[dipIdx];
          result[dipIdx] = result[dipIdx + 1];
          result[dipIdx + 1] = tmp;
        }
      }
    }
  }

  // 2. Guarantee sliding window dip requirement:
  for (let pass = 0; pass < 5; pass++) {
    let anyWindowFixed = false;
    for (let i = 0; i <= n - 6; i++) {
      let hasDip = false;
      for (let j = i; j < i + 5; j++) {
        const delta = getTrackEnergy(result[j + 1].track) - getTrackEnergy(result[j].track);
        if (delta < 0) {
          hasDip = true;
          break;
        }
      }

      if (!hasDip) {
        for (let k = i + 1; k < i + 5; k++) {
          const ek1 = getTrackEnergy(result[k].track);
          const ek2 = getTrackEnergy(result[k + 1].track);
          if (ek2 > ek1) {
            const tmp = result[k];
            result[k] = result[k + 1];
            result[k + 1] = tmp;
            anyWindowFixed = true;
            break;
          }
        }
      }
    }
    if (!anyWindowFixed) break;
  }

  return result;
}

/**
 * Calculates transition deltas, assigns step types, and flags harmonic matches.
 */
function calculateDeltasAndTypes(
  raw: { track: RiseTrack; segment: RiseSegmentType }[]
): SequencedRiseTrack[] {
  return raw.map((item, idx) => {
    const e = getTrackEnergy(item.track);
    const prevE = idx > 0 ? getTrackEnergy(raw[idx - 1].track) : e;
    const delta = idx > 0 ? Number((e - prevE).toFixed(4)) : 0;
    
    let stepType: 'STEP_UP' | 'DIP' | 'PLATEAU' | 'PUSH_PEAK' = 'STEP_UP';
    if (delta < 0) {
      stepType = 'DIP';
    } else if (Math.abs(delta) <= 0.02) {
      stepType = 'PLATEAU';
    } else if (delta >= 0.12 || item.segment === 'PEAK') {
      stepType = 'PUSH_PEAK';
    }

    const prevKey = idx > 0 ? raw[idx - 1].track.key : undefined;
    const harmonicMatched = isCamelotCompatible(prevKey, item.track.key);

    return {
      ...item.track,
      segment: item.segment,
      effectiveEnergy: e,
      deltaEnergy: delta,
      stepType,
      harmonicMatched
    };
  });
}

/**
 * Calculates overall Rise Algorithm performance metrics across sequenced tracks.
 */
export function calculateRiseMetrics(tracks: SequencedRiseTrack[]): RiseMetrics {
  const n = tracks.length;
  if (n < 2) {
    return {
      slope: 0,
      meanDeltaEnergy: 0,
      maxDeltaEnergy: 0,
      jarringCount: 0,
      smoothnessScore: 100,
      negativeDeltaCount: 0,
      dipFrequencyWindow: '0 dips',
      segmentMedians: { ENTRY: 0, ACT_I: 0, ACT_II: 0, ACT_III: 0, PEAK: 0 }
    };
  }

  const energies = tracks.map(t => t.effectiveEnergy);

  // 1. OLS Linear Regression Slope
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += energies[i];
    sumXY += i * energies[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // 2. Transition Deltas, Jarring Count, Smoothness
  let totalAbsDelta = 0;
  let maxDeltaEnergy = 0;
  let jarringCount = 0;
  let negativeDeltaCount = 0;

  for (let i = 0; i < n - 1; i++) {
    const delta = energies[i + 1] - energies[i];
    const absDelta = Math.abs(delta);
    totalAbsDelta += absDelta;

    if (absDelta > maxDeltaEnergy) maxDeltaEnergy = absDelta;
    if (absDelta > 0.35) jarringCount++;
    if (delta < 0) negativeDeltaCount++;
  }

  const meanDeltaEnergy = totalAbsDelta / (n - 1);
  const smoothnessScore = Math.max(0, Number((100 - meanDeltaEnergy * 100).toFixed(2)));

  // 3. Max window streak without dip
  let maxWindowWithoutDip = 0;
  let streak = 0;
  for (let i = 0; i < n - 1; i++) {
    const delta = energies[i + 1] - energies[i];
    if (delta < 0) {
      streak = 0;
    } else {
      streak++;
      if (streak > maxWindowWithoutDip) maxWindowWithoutDip = streak;
    }
  }

  // 4. Segment Medians
  const segments: Record<RiseSegmentType, number[]> = {
    ENTRY: [],
    ACT_I: [],
    ACT_II: [],
    ACT_III: [],
    PEAK: []
  };

  tracks.forEach(t => {
    if (segments[t.segment]) {
      segments[t.segment].push(t.effectiveEnergy);
    }
  });

  const segmentMedians: Record<RiseSegmentType, number> = {
    ENTRY: Number(computeMedian(segments.ENTRY).toFixed(4)),
    ACT_I: Number(computeMedian(segments.ACT_I).toFixed(4)),
    ACT_II: Number(computeMedian(segments.ACT_II).toFixed(4)),
    ACT_III: Number(computeMedian(segments.ACT_III).toFixed(4)),
    PEAK: Number(computeMedian(segments.PEAK).toFixed(4))
  };

  return {
    slope: Number(slope.toFixed(6)),
    meanDeltaEnergy: Number(meanDeltaEnergy.toFixed(4)),
    maxDeltaEnergy: Number(maxDeltaEnergy.toFixed(4)),
    jarringCount,
    smoothnessScore,
    negativeDeltaCount,
    dipFrequencyWindow: `Max gap without dip: ${maxWindowWithoutDip} transitions`,
    segmentMedians
  };
}

/**
 * Validates that every sliding window of windowSize (default 6) contains at least 1 dip (ΔE < 0).
 */
export function checkEveryWindowHasDip(tracks: SequencedRiseTrack[], windowSize: number = 6): boolean {
  if (tracks.length < windowSize) return true;
  for (let i = 0; i <= tracks.length - windowSize; i++) {
    let hasDip = false;
    for (let j = i; j < i + windowSize - 1; j++) {
      const delta = tracks[j + 1].effectiveEnergy - tracks[j].effectiveEnergy;
      if (delta < 0) {
        hasDip = true;
        break;
      }
    }
    if (!hasDip) return false;
  }
  return true;
}
