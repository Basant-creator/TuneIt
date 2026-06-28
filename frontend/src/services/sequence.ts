import type { SpotifyTrack } from '@/types/spotify';
import type {
  SequencingConfig,
  SequencingResult,
  TransitionMetric,
} from '@/types/sequence';

/**
 * Maps pitch class notation (0-11) and mode (0-1) to Camelot Wheel shorthand (1A-12B).
 * Camelot Wheel is the industry standard for harmonic mixing.
 */
export function mapPitchClassToCamelot(key: number, mode: number): string {
  // Pitch Class: 0 = C, 1 = C♯, 2 = D, 3 = D♯, 4 = E, 5 = F, 6 = F♯, 7 = G, 8 = G♯, 9 = A, 10 = A♯, 11 = B
  // Major keys (mode = 1) mapping:
  const majorMapping: Record<number, string> = {
    0: '8B', // C
    1: '3B', // C♯
    2: '10B', // D
    3: '5B', // D♯
    4: '12B', // E
    5: '7B', // F
    6: '2B', // F♯
    7: '9B', // G
    8: '4B', // G♯
    9: '11B', // A
    10: '6B', // A♯
    11: '1B', // B
  };

  // Minor keys (mode = 0) mapping:
  const minorMapping: Record<number, string> = {
    0: '5A', // C minor
    1: '12A', // C♯ minor
    2: '7A', // D minor
    3: '2A', // D♯ minor
    4: '9A', // E minor
    5: '4A', // F minor
    6: '11A', // F♯ minor
    7: '6A', // G minor
    8: '1A', // G♯ minor
    9: '8A', // A minor
    10: '3A', // A♯ minor
    11: '10A', // B minor
  };

  return mode === 1 ? majorMapping[key] || '8B' : minorMapping[key] || '8A';
}

/**
 * Calculates transition metrics between two tracks, including harmonic compatibility
 * and BPM drift penalties.
 */
export function calculateTransition(
  fromTrack: SpotifyTrack,
  toTrack: SpotifyTrack
): TransitionMetric {
  const defaultFeatures = { tempo: 120, key: 0, mode: 1, energy: 0.5 };
  const featA = fromTrack.audioFeatures || defaultFeatures;
  const featB = toTrack.audioFeatures || defaultFeatures;

  // 1. BPM / Tempo analysis
  const bpmDelta = Math.abs(featA.tempo - featB.tempo);

  // 2. Harmonic / Key compatibility analysis
  const camelotA = mapPitchClassToCamelot(featA.key, featA.mode);
  const camelotB = mapPitchClassToCamelot(featB.key, featB.mode);

  const numA = parseInt(camelotA.slice(0, -1), 10);
  const letterA = camelotA.slice(-1);
  const numB = parseInt(camelotB.slice(0, -1), 10);
  const letterB = camelotB.slice(-1);

  let keyCompatible = false;
  let keyMatchScore = 0; // 0 to 100

  // Standard Camelot rules:
  // - Same key (e.g. 8A -> 8A): Perfect match
  // - Adjacent keys (e.g. 8A -> 7A or 9A): Perfect harmonic transition (1 step)
  // - Major/Minor shift (e.g. 8A -> 8B): Perfect relative key switch
  const stepDiff = Math.abs(numA - numB);
  const cyclicDiff = Math.min(stepDiff, 12 - stepDiff);

  if (camelotA === camelotB) {
    keyCompatible = true;
    keyMatchScore = 100;
  } else if (letterA === letterB && cyclicDiff === 1) {
    keyCompatible = true;
    keyMatchScore = 90;
  } else if (numA === numB && letterA !== letterB) {
    keyCompatible = true;
    keyMatchScore = 80;
  } else if (cyclicDiff === 1 && letterA !== letterB) {
    // Semi-compatible (e.g. 8A -> 9B - diagonal transition)
    keyCompatible = true;
    keyMatchScore = 50;
  } else {
    keyCompatible = false;
    keyMatchScore = 10;
  }

  // 3. Compute overall Transition score (0-100)
  // BPM Penalty: lose 10 points per BPM difference
  const bpmPenalty = bpmDelta * 8;
  const overallTransitionScore = Math.max(
    0,
    Math.min(100, Math.round(keyMatchScore * 0.6 + (100 - bpmPenalty) * 0.4))
  );

  return {
    fromTrackId: fromTrack.id,
    toTrackId: toTrack.id,
    bpmDelta,
    keyCompatible,
    keyMatchScore,
    energyDelta: Math.abs((featA.energy || 0.5) - (featB.energy || 0.5)),
    overallTransitionScore,
  };
}

/**
 * Sequence Playlist Engine
 * Takes a list of tracks and mixes them according to the BPM and key config parameters.
 */
export function sequencePlaylist(
  tracks: SpotifyTrack[],
  config: SequencingConfig
): SequencingResult {
  if (tracks.length <= 1) {
    return {
      originalTracks: tracks,
      sequencedTracks: tracks,
      transitions: [],
      averageScore: 100,
      totalDurationMs: tracks.reduce((acc, t) => acc + t.durationMs, 0),
    };
  }

  // A basic greedy algorithm to sequence the tracks based on mixing compatibility
  const unsequenced = [...tracks];
  const sequenced: SpotifyTrack[] = [];
  const transitions: TransitionMetric[] = [];

  // Sort original tracks by initial tempo to make a baseline if configuration asks for ascending
  if (config.targetCurve === 'asc') {
    unsequenced.sort(
      (a, b) => (a.audioFeatures?.tempo || 0) - (b.audioFeatures?.tempo || 0)
    );
  }

  // Start with the first track
  const first = unsequenced.shift()!;
  sequenced.push(first);

  while (unsequenced.length > 0) {
    const current = sequenced[sequenced.length - 1];
    let bestIndex = 0;
    let bestScore = -1;
    let bestTransition: TransitionMetric | null = null;

    // Find the next track that offers the best transition score
    for (let i = 0; i < unsequenced.length; i++) {
      const candidate = unsequenced[i];
      const transition = calculateTransition(current, candidate);

      // Score weight adjustments
      let score = transition.overallTransitionScore;

      // Curve penalties (e.g. if we want ascending and tempo decreases, penalize it)
      if (config.targetCurve === 'asc') {
        const tempoCurrent = current.audioFeatures?.tempo || 120;
        const tempoCandidate = candidate.audioFeatures?.tempo || 120;
        if (tempoCandidate < tempoCurrent) {
          score -= 30; // Strong penalty for dropping BPM on ascending curve
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
        bestTransition = transition;
      }
    }

    const nextTrack = unsequenced.splice(bestIndex, 1)[0];
    sequenced.push(nextTrack);
    if (bestTransition) {
      transitions.push(bestTransition);
    }
  }

  const averageScore = Math.round(
    transitions.reduce((sum, t) => sum + t.overallTransitionScore, 0) /
      transitions.length
  );

  const totalDurationMs = sequenced.reduce((sum, t) => sum + t.durationMs, 0);

  return {
    originalTracks: tracks,
    sequencedTracks: sequenced,
    transitions,
    averageScore,
    totalDurationMs,
  };
}
