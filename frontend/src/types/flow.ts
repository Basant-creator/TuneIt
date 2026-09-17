/**
 * Types mirroring the backend flow-engine contract
 * (backend/src/services/flowEngineService.ts).
 *
 * Every engine — Rise, Drift, Unhinged, Frame — responds with this exact shape,
 * so the UI never branches on which engine ran.
 */

/** Frontend mode ids, matching `flowModes` in `data/homeData.ts`. */
export type FlowMode = 'bu' | 'df' | 'ph' | 'cm';

export type EngineName = 'RISE' | 'DRIFT' | 'UNHINGED' | 'FRAME';

export interface FlowTrack {
  videoId: string;
  title: string;
  artist: string;
  estimatedBpm?: number;
  intensityScore?: number;
  originalIndex?: number;
  /** Rise segment, Frame act, or Unhinged role. */
  segment?: string;
  /** Energy change from the previous track in the sequence. */
  deltaEnergy?: number;
  /** Why the track was excluded (only on `harshTracks`). */
  reason?: string;
  vibeReview?: string;
  /** Position in the list currently rendered. */
  displayIndex?: number;
}

export interface FlowMetrics {
  smoothnessScore: number;
  meanDeltaEnergy: number;
  maxDeltaEnergy: number;
  jarringCount: number;
  meanBpmDelta: number;
  energySlope: number;
  energyCurve: number[];
}

export interface FlowEngineResponse {
  engine: EngineName;
  mode: FlowMode;
  label: string;
  message: string;
  originalCount: number;
  acceptedCount: number;
  filteredCount: number;
  smoothnessScore: number;
  metrics: FlowMetrics;
  engineMetrics: Record<string, unknown>;
  tracks: FlowTrack[];
  harshTracks: FlowTrack[];
  durationMs?: number;
}

export interface RecommendedTrack {
  videoId: string;
  title: string;
  artist: string;
  estimatedBpm: number;
  intensityScore: number;
  vibeReview: string;
}

export interface UserProfile {
  id?: string;
  display_name?: string;
  email?: string;
  images?: Array<{ url: string }>;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  images?: Array<{ url: string }>;
  tracks?: { total: number };
}

export interface ExportResult {
  message: string;
  playlist: { id: string; title: string; url: string };
  remainingExports: number;
}
