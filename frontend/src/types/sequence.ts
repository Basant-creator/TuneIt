import type { SpotifyTrack } from './spotify';

export type BPMLimitType = 'asc' | 'desc' | 'flat' | 'camelback' | 'custom';

export interface SequencingConfig {
  targetCurve: BPMLimitType;
  bpmWeight: number; // 0 to 1 priority
  keyWeight: number; // 0 to 1 priority (Camelot wheel/harmonic mixing)
  energyWeight: number; // 0 to 1 priority
  allowTempoAdjustment: boolean; // Virtual pitch-shifting simulation
  maxBPMDifference: number; // Maximum allowed BPM jump before penalty
}

export interface TransitionMetric {
  fromTrackId: string;
  toTrackId: string;
  bpmDelta: number; // BPM difference
  keyCompatible: boolean; // Is harmonic mix possible
  keyMatchScore: number; // 0 (terrible) to 100 (harmonic match)
  energyDelta: number; // Energy flow difference
  overallTransitionScore: number; // 0 to 100 index of mixing compatibility
}

export interface SequencingResult {
  playlistId?: string;
  originalTracks: SpotifyTrack[];
  sequencedTracks: SpotifyTrack[];
  transitions: TransitionMetric[];
  averageScore: number; // Overall sequence mix score (0 to 100)
  totalDurationMs: number;
}
