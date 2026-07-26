/**
 * Unhinged Algorithm (Subversive & Curveball Sequencing Engine)
 * 
 * Delivers calculated genre whiplash and intentional curveballs (ΔE >= 0.45).
 * Grounded by hidden harmonic or frequency/rhythm anchors.
 * 
 * Refinements:
 * 1. Multi-Anchor Candidate Scoring: Composite weighting (Harmonic 1.0 + Rhythm 1.0 + Dual Bonus 0.5) to boost BOTH success rates (~65-75%+).
 * 2. Expanded Anchor Tolerances: Sub-bass density ΔSubBass <= 0.20, syncopated 0.75x (3:4) and 1.33x (4:3) BPM sync anchors.
 * 3. Dead Weight Filter: Pre-scans for un-anchorable acoustic outliers (Yield Target: 85% - 90%).
 * 4. Setup Cap: Maximum 3 setup tracks before forcing an anchored curveball drop in the curveball zone.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  arousal: number; // Primary energy feature metric (0.0 to 1.0)
  intensity?: number; // Alias for arousal
  valence: number;
  genre: string;
  key: string; // Camelot notation, e.g., '8A'
  subBassDensity: number; // Sub-bass energy density (0.0 to 1.0)
}

export type UnhingedRole = 'SETUP' | 'CURVEBALL' | 'RECOVERY';

export interface SequencedTrack extends Track {
  role: UnhingedRole;
  anchorReason?: string;
  anchorType?: 'HARMONIC' | 'FREQUENCY_RHYTHM' | 'BOTH' | 'NONE';
  shockDelta?: number;
  polarDistance?: number;
}

export interface RejectedTrack {
  track: Partial<Track>;
  reason: string;
}

export interface AnchorCheckResult {
  isAnchored: boolean;
  anchorReason?: string;
  anchorType: 'HARMONIC' | 'FREQUENCY_RHYTHM' | 'BOTH' | 'NONE';
  harmonicMatched: boolean;
  frequencyRhythmMatched: boolean;
  anchorScore: number;
}

export interface UnhingedMetrics {
  meanShockDelta: number;
  maxShockDelta: number;
  curveballFrequency: string;
  harmonicAnchorRate: string;
  frequencyAnchorRate: string;
  totalCurveballs: number;
  yieldRetention: string;
  smoothnessScore: number;
}

export interface UnhingedOutput {
  sequencedTracks: SequencedTrack[];
  rejectedTracks: RejectedTrack[];
  anchorLogs: string[];
  yieldRetention: string;
  smoothnessScore: number;
  metrics: UnhingedMetrics;
}

/**
 * Normalizes input objects to ensure all required Track properties exist deterministically.
 */
export function normalizeTrack(raw: any, index: number = 0): Track {
  const id = raw.id ?? `track_${index + 1}`;
  const title = raw.title ?? 'Unknown Title';
  const artist = raw.artist ?? 'Unknown Artist';
  const bpm = typeof raw.bpm === 'number' && !isNaN(raw.bpm) ? raw.bpm : 120;
  
  const energyVal = raw.arousal ?? raw.intensity ?? raw.energy;
  const arousal = typeof energyVal === 'number' && !isNaN(energyVal) ? Math.max(0, Math.min(1, energyVal)) : 0.5;
  
  const valenceVal = raw.valence;
  const valence = typeof valenceVal === 'number' && !isNaN(valenceVal) ? Math.max(0, Math.min(1, valenceVal)) : 0.5;
  
  const genre = raw.genre && typeof raw.genre === 'string' ? raw.genre : deriveGenreFromTrack(title, artist, bpm, arousal);
  const key = raw.key && typeof raw.key === 'string' ? raw.key : deriveCamelotKey(id, bpm, arousal);
  
  const subBassVal = raw.subBassDensity;
  const subBassDensity = typeof subBassVal === 'number' && !isNaN(subBassVal) 
    ? Math.max(0, Math.min(1, subBassVal))
    : deriveSubBassDensity(id, bpm, arousal);

  return {
    id,
    title,
    artist,
    bpm,
    arousal,
    intensity: arousal,
    valence,
    genre,
    key,
    subBassDensity
  };
}

function deriveCamelotKey(id: string, bpm: number, arousal: number): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 10007;
  }
  const keyNum = ((Math.floor(hash + bpm + arousal * 100)) % 12) + 1;
  const mode = (hash % 2 === 0) ? 'A' : 'B';
  return `${keyNum}${mode}`;
}

function deriveSubBassDensity(id: string, bpm: number, arousal: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 17 + id.charCodeAt(i)) % 503;
  }
  const rawDensity = (hash / 503.0) * 0.4 + (arousal * 0.5) + (bpm > 130 ? 0.1 : 0);
  return Number(Math.max(0.05, Math.min(0.95, rawDensity)).toFixed(2));
}

function deriveGenreFromTrack(title: string, artist: string, bpm: number, arousal: number): string {
  if (bpm < 90 && arousal < 0.4) return 'Ambient / Chill';
  if (bpm < 110 && arousal < 0.5) return 'Downtempo / Jazz';
  if (bpm >= 110 && bpm <= 130 && arousal >= 0.5) return 'Indie Electronic';
  if (bpm > 130 && arousal >= 0.7) return 'Hyper Energy / Rock';
  if (arousal >= 0.7) return 'Electro / Dance';
  return 'Alternative';
}

export function isCamelotCompatible(keyA: string, keyB: string): boolean {
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
  const isAdjacentNum = diff === 1 || diff === 11;
  return isAdjacentNum;
}

/**
 * Checks anchor safety conditions between previous track and candidate track.
 * Widens sub-bass density delta to <= 0.20 and adds syncopated 0.75x (3:4) & 1.33x (4:3) BPM sync anchors.
 */
export function checkAnchor(prev: Track, cand: Track): AnchorCheckResult {
  const harmonicMatched = isCamelotCompatible(prev.key, cand.key);

  // Sub-Bass Density Delta threshold widened to <= 0.20
  const subBassDelta = Math.abs(cand.subBassDensity - prev.subBassDensity);
  const isSubBassAnchored = subBassDelta <= 0.20;

  // BPM Sync Multipliers expanded to include 0.5x, 0.75x (3:4), 1.0x, 1.33x (4:3), 2.0x
  const bpmRatio = cand.bpm / (prev.bpm || 1);
  const isBpmSync = 
    Math.abs(bpmRatio - 1.0) <= 0.08 ||
    Math.abs(bpmRatio - 0.5) <= 0.08 ||
    Math.abs(bpmRatio - 2.0) <= 0.08 ||
    Math.abs(bpmRatio - 0.75) <= 0.08 ||
    Math.abs(bpmRatio - 1.333) <= 0.08 ||
    Math.abs(cand.bpm - prev.bpm) <= 10 ||
    Math.abs(cand.bpm - 0.75 * prev.bpm) <= 3 ||
    Math.abs(cand.bpm - 1.333 * prev.bpm) <= 3;

  const frequencyRhythmMatched = isSubBassAnchored || isBpmSync;
  const isAnchored = harmonicMatched || frequencyRhythmMatched;

  let anchorType: 'HARMONIC' | 'FREQUENCY_RHYTHM' | 'BOTH' | 'NONE' = 'NONE';
  if (harmonicMatched && frequencyRhythmMatched) anchorType = 'BOTH';
  else if (harmonicMatched) anchorType = 'HARMONIC';
  else if (frequencyRhythmMatched) anchorType = 'FREQUENCY_RHYTHM';

  // Multi-Anchor Candidate Scoring: Harmonic (1.0) + Rhythm (1.0) + Dual Bonus (0.5)
  const harmonicScore = harmonicMatched ? 1.0 : 0.0;
  const rhythmScore = frequencyRhythmMatched ? 1.0 : 0.0;
  const dualAnchorBonus = (harmonicMatched && frequencyRhythmMatched) ? 0.5 : 0.0;
  const anchorScore = harmonicScore + rhythmScore + dualAnchorBonus;

  const reasons: string[] = [];
  if (harmonicMatched) {
    reasons.push(`Harmonic Key Anchor (${prev.key} -> ${cand.key})`);
  }
  if (isSubBassAnchored) {
    reasons.push(`Sub-Bass Density Anchor (ΔSubBass = ${subBassDelta.toFixed(2)})`);
  }
  if (isBpmSync) {
    reasons.push(`BPM Sync Anchor (${cand.bpm} BPM / ${prev.bpm} BPM)`);
  }

  return {
    isAnchored,
    anchorReason: reasons.length > 0 ? reasons.join(' & ') : undefined,
    anchorType,
    harmonicMatched,
    frequencyRhythmMatched,
    anchorScore
  };
}

export function calculatePolarDistance(a: Track, b: Track): number {
  const energyA = a.arousal ?? a.intensity ?? 0;
  const energyB = b.arousal ?? b.intensity ?? 0;
  return Math.sqrt(Math.pow(a.valence - b.valence, 2) + Math.pow(energyA - energyB, 2));
}

export function calculateEnergyDelta(a: Track, b: Track): number {
  const energyA = a.arousal ?? a.intensity ?? 0;
  const energyB = b.arousal ?? b.intensity ?? 0;
  return Math.abs(energyB - energyA);
}

/**
 * Main Pipeline Execution Logic for the Unhinged Engine.
 */
export function processUnhingedAlgorithm(inputPool: any[]): UnhingedOutput {
  const rejectedTracks: RejectedTrack[] = [];
  const validCandidates: Track[] = [];

  // Phase A: High-Yield Acceptance Filter
  inputPool.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') {
      rejectedTracks.push({ track: {}, reason: 'Corrupt audio metadata object' });
      return;
    }
    const bpm = raw.bpm;
    if (typeof bpm === 'number' && (isNaN(bpm) || bpm <= 0 || bpm > 300)) {
      rejectedTracks.push({ track: raw, reason: 'Invalid or unparseable BPM audio metadata' });
      return;
    }
    const energy = raw.arousal ?? raw.intensity ?? raw.energy;
    if (typeof energy === 'number' && (isNaN(energy) || energy < 0 || energy > 1)) {
      rejectedTracks.push({ track: raw, reason: 'Out-of-bounds energy/arousal metric' });
      return;
    }

    validCandidates.push(normalizeTrack(raw, idx));
  });

  // Pre-scan Dead Weight Filter for Acoustic Outliers & Orphan Tracks
  // Target Yield Retention: 85% - 90%
  const acceptedTracks: Track[] = [];
  validCandidates.forEach(cand => {
    const genreStr = (cand.genre || '').toLowerCase();
    const isExplicitOutlier = genreStr.includes('outlier');
    const isExtremeEnergyOutlier = cand.arousal < 0.20 || cand.arousal > 0.85;

    const harmonicPartners = validCandidates.filter(
      other => other.id !== cand.id && isCamelotCompatible(cand.key, other.key)
    );

    const hasStrongOppositeAnchor = harmonicPartners.some(
      other => Math.abs(other.arousal - cand.arousal) >= 0.40 && Math.abs(cand.subBassDensity - other.subBassDensity) <= 0.20
    );

    const isOrphan = isExplicitOutlier || (isExtremeEnergyOutlier && !hasStrongOppositeAnchor);

    if (isOrphan) {
      rejectedTracks.push({
        track: cand,
        reason: 'Unhinged Filter: Un-anchorable acoustic outlier'
      });
    } else {
      acceptedTracks.push(cand);
    }
  });

  const totalInput = inputPool.length;
  const yieldPctNum = totalInput > 0 ? (acceptedTracks.length / totalInput) * 100 : 0;
  const yieldRetentionStr = yieldPctNum.toFixed(1) + '%';

  if (acceptedTracks.length === 0) {
    return {
      sequencedTracks: [],
      rejectedTracks,
      anchorLogs: [],
      yieldRetention: yieldRetentionStr,
      smoothnessScore: 0,
      metrics: {
        meanShockDelta: 0,
        maxShockDelta: 0,
        curveballFrequency: 'N/A',
        harmonicAnchorRate: '0%',
        frequencyAnchorRate: '0%',
        totalCurveballs: 0,
        yieldRetention: yieldRetentionStr,
        smoothnessScore: 0
      }
    };
  }

  const N = acceptedTracks.length;
  const pool = [...acceptedTracks];
  const sequenced: SequencedTrack[] = [];
  const anchorLogs: string[] = [];

  const MIN_CURVEBALL_PROGRESS = 0.15;
  const MAX_CURVEBALL_PROGRESS = 0.75;
  const MAX_SETUP_CAP = 3;

  const pickSmoothSetupTrack = (prevTrack: Track): Track => {
    let bestIdx = 0;
    let minScore = Infinity;

    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i];
      const deltaE = cand.arousal - prevTrack.arousal;
      const isSameGenre = cand.genre === prevTrack.genre;
      
      const rampDiff = Math.abs(deltaE - 0.12);
      const score = Math.abs(cand.arousal - prevTrack.arousal) + rampDiff + (isSameGenre ? 0 : 0.15);

      if (score < minScore) {
        minScore = score;
        bestIdx = i;
      }
    }
    return pool.splice(bestIdx, 1)[0];
  };

  // Start with a stable setup track (mid energy)
  pool.sort((a, b) => a.arousal - b.arousal);
  const midIdx = Math.floor(pool.length / 2);
  const startTrack = pool.splice(midIdx, 1)[0];
  
  sequenced.push({
    ...startTrack,
    role: 'SETUP'
  });

  let setupCountSinceLastCurveball = 1;

  while (pool.length > 0) {
    const currentProgress = sequenced.length / N;
    const lastTrack = sequenced[sequenced.length - 1];

    const inCurveballZone = currentProgress >= MIN_CURVEBALL_PROGRESS && currentProgress <= MAX_CURVEBALL_PROGRESS;
    const isSetupCapReached = setupCountSinceLastCurveball >= MAX_SETUP_CAP;
    const readyForCurveball = inCurveballZone && (setupCountSinceLastCurveball >= 2 || isSetupCapReached);

    if (readyForCurveball) {
      let bestCurveballIndex = -1;
      let maxCompositeScore = -1;
      let bestAnchorInfo: AnchorCheckResult | null = null;
      let bestShockDelta = 0;
      let bestPolarDist = 0;

      // Pass 1: Target ΔE >= 0.45 + Anchor
      for (let i = 0; i < pool.length; i++) {
        const cand = pool[i];
        const shock = calculateEnergyDelta(lastTrack, cand);
        if (shock < 0.45) continue;

        const anchorCheck = checkAnchor(lastTrack, cand);
        if (!anchorCheck.isAnchored) continue;

        const pDist = calculatePolarDistance(lastTrack, cand);
        // Multi-anchor candidate scoring: totalAnchorScore (2.0 weight) + polarDistance
        const compScore = anchorCheck.anchorScore * 2.0 + pDist;

        if (compScore > maxCompositeScore) {
          maxCompositeScore = compScore;
          bestCurveballIndex = i;
          bestAnchorInfo = anchorCheck;
          bestShockDelta = shock;
          bestPolarDist = pDist;
        }
      }

      // Pass 2: Min Shock Threshold ΔE >= 0.40 + Anchor
      if (bestCurveballIndex === -1) {
        for (let i = 0; i < pool.length; i++) {
          const cand = pool[i];
          const shock = calculateEnergyDelta(lastTrack, cand);
          if (shock < 0.40) continue;

          const anchorCheck = checkAnchor(lastTrack, cand);
          if (!anchorCheck.isAnchored) continue;

          const pDist = calculatePolarDistance(lastTrack, cand);
          const compScore = anchorCheck.anchorScore * 2.0 + pDist;

          if (compScore > maxCompositeScore) {
            maxCompositeScore = compScore;
            bestCurveballIndex = i;
            bestAnchorInfo = anchorCheck;
            bestShockDelta = shock;
            bestPolarDist = pDist;
          }
        }
      }

      // Pass 3: Forced Drop if setup cap reached (3 setup tracks max) -> Pick highest composite score candidate (min ΔE 0.35)
      if (bestCurveballIndex === -1 && isSetupCapReached) {
        for (let i = 0; i < pool.length; i++) {
          const cand = pool[i];
          const shock = calculateEnergyDelta(lastTrack, cand);
          if (shock < 0.35) continue;

          const anchorCheck = checkAnchor(lastTrack, cand);
          if (!anchorCheck.isAnchored) continue;

          const pDist = calculatePolarDistance(lastTrack, cand);
          const compScore = anchorCheck.anchorScore * 2.0 + pDist;

          if (compScore > maxCompositeScore) {
            maxCompositeScore = compScore;
            bestCurveballIndex = i;
            bestAnchorInfo = anchorCheck;
            bestShockDelta = shock;
            bestPolarDist = pDist;
          }
        }
      }

      if (bestCurveballIndex !== -1 && bestAnchorInfo) {
        const curveballTrack = pool.splice(bestCurveballIndex, 1)[0];
        const logEntry = `⚡ CURVEBALL [${(sequenced.length + 1).toString().padStart(2, '0')}/${N}]: "${lastTrack.title}" (${lastTrack.genre}/${lastTrack.key}, E=${lastTrack.arousal.toFixed(2)}) -> "${curveballTrack.title}" (${curveballTrack.genre}/${curveballTrack.key}, E=${curveballTrack.arousal.toFixed(2)}) | ΔE=${bestShockDelta.toFixed(2)} | Anchor: ${bestAnchorInfo.anchorReason}`;
        anchorLogs.push(logEntry);

        sequenced.push({
          ...curveballTrack,
          role: 'CURVEBALL',
          anchorReason: bestAnchorInfo.anchorReason,
          anchorType: bestAnchorInfo.anchorType,
          shockDelta: Number(bestShockDelta.toFixed(4)),
          polarDistance: Number(bestPolarDist.toFixed(4))
        });

        setupCountSinceLastCurveball = 0;

        // Immediately follow with Recovery track
        if (pool.length > 0) {
          const cbTrack = sequenced[sequenced.length - 1];
          let bestRecoveryIndex = -1;
          let minRecoveryDiff = Infinity;

          for (let i = 0; i < pool.length; i++) {
            const cand = pool[i];
            const isSameGenre = cand.genre === cbTrack.genre;
            const energyDiff = calculateEnergyDelta(cbTrack, cand);
            const valDiff = Math.abs(cand.valence - cbTrack.valence);

            const cost = energyDiff + valDiff + (isSameGenre ? 0 : 0.3);
            if (cost < minRecoveryDiff) {
              minRecoveryDiff = cost;
              bestRecoveryIndex = i;
            }
          }

          if (bestRecoveryIndex !== -1) {
            const recoveryTrack = pool.splice(bestRecoveryIndex, 1)[0];
            sequenced.push({
              ...recoveryTrack,
              role: 'RECOVERY'
            });
            setupCountSinceLastCurveball = 1;
          }
        }
        continue;
      }
    }

    // Normal Setup Step
    const nextTrack = pickSmoothSetupTrack(lastTrack);
    sequenced.push({
      ...nextTrack,
      role: 'SETUP'
    });
    setupCountSinceLastCurveball++;
  }

  // Metrics Calculation
  const curveballs = sequenced.filter(t => t.role === 'CURVEBALL');
  const shockDeltas = curveballs.map(t => t.shockDelta ?? 0);
  const totalShockDelta = shockDeltas.reduce((a, b) => a + b, 0);
  const meanShockDelta = curveballs.length > 0 ? Number((totalShockDelta / curveballs.length).toFixed(4)) : 0;
  const maxShockDelta = shockDeltas.length > 0 ? Number(Math.max(...shockDeltas).toFixed(4)) : 0;

  const harmonicAnchoredCount = curveballs.filter(t => t.anchorType === 'HARMONIC' || t.anchorType === 'BOTH').length;
  const freqAnchoredCount = curveballs.filter(t => t.anchorType === 'FREQUENCY_RHYTHM' || t.anchorType === 'BOTH').length;

  const harmonicRatePct = curveballs.length > 0 ? ((harmonicAnchoredCount / curveballs.length) * 100).toFixed(1) + '%' : '0%';
  const freqRatePct = curveballs.length > 0 ? ((freqAnchoredCount / curveballs.length) * 100).toFixed(1) + '%' : '0%';
  const cbFrequencyStr = curveballs.length > 0 ? `1 every ${(sequenced.length / curveballs.length).toFixed(1)} tracks` : '0';

  let totalNonCbDelta = 0;
  let nonCbCount = 0;
  for (let i = 0; i < sequenced.length - 1; i++) {
    if (sequenced[i + 1].role !== 'CURVEBALL') {
      totalNonCbDelta += Math.abs(sequenced[i + 1].arousal - sequenced[i].arousal);
      nonCbCount++;
    }
  }
  const meanNonCbDelta = nonCbCount > 0 ? totalNonCbDelta / nonCbCount : 0;
  const smoothnessScore = Math.max(0, Number((100 - meanNonCbDelta * 100).toFixed(2)));

  return {
    sequencedTracks: sequenced,
    rejectedTracks,
    anchorLogs,
    yieldRetention: yieldRetentionStr,
    smoothnessScore,
    metrics: {
      meanShockDelta,
      maxShockDelta,
      curveballFrequency: cbFrequencyStr,
      harmonicAnchorRate: harmonicRatePct,
      frequencyAnchorRate: freqRatePct,
      totalCurveballs: curveballs.length,
      yieldRetention: yieldRetentionStr,
      smoothnessScore
    }
  };
}
