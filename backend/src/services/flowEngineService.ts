/**
 * Flow Engine Service (src/services/flowEngineService.ts)
 *
 * Single adapter layer in front of the four sequencing engines.
 *
 * Each engine has its own input/output vocabulary (`id` vs `videoId`, `bpm` vs
 * `estimatedBpm`, `intensity` vs `arousal`, `harshTracks` vs `rejectedTracks`).
 * Nothing downstream should have to know that, so every engine is normalised
 * here into one `FlowEngineResponse`, and — critically — every returned track
 * keeps its YouTube `videoId` so the sequence stays exportable.
 */

import { generateDriftPlaylist, DriftTrack } from '../utils/driftAlgorithm';
import { processFrameAlgorithm, Track as FrameTrack } from '../utils/frameAlgorithm';
import { processUnhingedAlgorithm, Track as UnhingedTrack } from '../utils/unhingedAlgorithm';
import { processRiseAlgorithm, RiseTrack } from '../utils/riseAlgorithm';
import { computeFlowMetrics, FlowMetrics } from '../utils/flowMetrics';

/** Frontend-facing mode ids (must match `flowModes` in the frontend `homeData.ts`). */
export type FlowMode = 'bu' | 'df' | 'ph' | 'cm';

export type EngineName = 'RISE' | 'DRIFT' | 'UNHINGED' | 'FRAME';

/** Canonical track shape returned to the client by every engine. */
export interface FlowTrack {
  videoId: string;
  title: string;
  artist: string;
  estimatedBpm: number;
  intensityScore: number;
  originalIndex?: number;
  /** Engine-specific position label: Rise segment, Frame act, or Unhinged role. */
  segment?: string;
  /** Energy change relative to the previous track in the final sequence. */
  deltaEnergy?: number;
  /** Why a track was excluded (only present on `harshTracks`). */
  reason?: string;
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
  /** Raw, engine-specific metric bag, kept for debugging and benchmarks. */
  engineMetrics: Record<string, unknown>;
  tracks: FlowTrack[];
  harshTracks: FlowTrack[];
}

/** Input from the enrichment pipeline (YouTube + Gemini/cache). */
export interface EnrichedTrack {
  videoId: string;
  title: string;
  artist: string;
  estimatedBpm: number;
  intensityScore: number;
  originalIndex?: number;
  /** Musical positivity 0.0-1.0; undefined when the analyser could not tell. */
  valence?: number;
  /** Camelot key, e.g. "8A"; undefined when unknown. Never fabricated. */
  camelotKey?: string;
}

export const ENGINE_BY_MODE: Record<FlowMode, { engine: EngineName; label: string; message: string }> = {
  bu: {
    engine: 'RISE',
    label: 'Rise',
    message: 'Playlist rearranged with the Rise Engine (Staircase Ascent)',
  },
  df: {
    engine: 'DRIFT',
    label: 'Drift',
    message: 'Playlist rearranged with the Mental Drift Engine (Continuous Immersion)',
  },
  ph: {
    engine: 'UNHINGED',
    label: 'Unhinged',
    message: 'Playlist rearranged with the Unhinged Engine (Subversive Whiplash)',
  },
  cm: {
    engine: 'FRAME',
    label: 'Frame',
    message: 'Playlist rearranged with the Frame Engine (3-Act Narrative)',
  },
};

export const SUPPORTED_MODES = Object.keys(ENGINE_BY_MODE) as FlowMode[];

/** Route slug (`/api/playlists/:id/drift`) -> mode id, for the legacy endpoints. */
export const MODE_BY_SLUG: Record<string, FlowMode> = {
  rise: 'bu',
  drift: 'df',
  unhinged: 'ph',
  frame: 'cm',
};

export function isFlowMode(value: unknown): value is FlowMode {
  return typeof value === 'string' && (SUPPORTED_MODES as string[]).includes(value);
}

/**
 * Rebuilds a full FlowTrack from an engine's output row.
 *
 * Frame/Unhinged/Rise rename fields internally, so we look the original
 * enriched track back up by id and only take ordering + annotations from the
 * engine. This is what guarantees `videoId` survives every engine.
 */
function toFlowTrack(
  raw: Record<string, any>,
  lookup: Map<string, EnrichedTrack>,
  extras: { segment?: string; deltaEnergy?: number; reason?: string } = {}
): FlowTrack | null {
  const videoId: string | undefined = raw.videoId ?? raw.id;
  if (!videoId) return null;

  const source = lookup.get(videoId);
  const estimatedBpm = source?.estimatedBpm ?? raw.estimatedBpm ?? raw.bpm ?? 120;
  const intensityScore =
    source?.intensityScore ?? raw.intensityScore ?? raw.intensity ?? raw.arousal ?? 0.5;

  const track: FlowTrack = {
    videoId,
    title: source?.title ?? raw.title ?? 'Unknown Title',
    artist: source?.artist ?? raw.artist ?? 'Unknown Artist',
    estimatedBpm: Math.round(estimatedBpm),
    intensityScore: Number(Number(intensityScore).toFixed(2)),
    originalIndex: source?.originalIndex,
  };

  if (extras.segment) track.segment = extras.segment;
  if (extras.deltaEnergy !== undefined) track.deltaEnergy = extras.deltaEnergy;
  if (extras.reason) track.reason = extras.reason;

  return track;
}

/** Recomputes ΔE across the final sequence so the value always matches what is shown. */
function applySequenceDeltas(tracks: FlowTrack[]): FlowTrack[] {
  return tracks.map((track, idx) => ({
    ...track,
    deltaEnergy:
      idx === 0 ? 0 : Number((track.intensityScore - tracks[idx - 1].intensityScore).toFixed(4)),
  }));
}

/**
 * Runs the engine selected by `mode` over the enriched track pool and returns
 * the normalised response.
 */
export function runFlowEngine(mode: FlowMode, enriched: EnrichedTrack[]): FlowEngineResponse {
  const descriptor = ENGINE_BY_MODE[mode];
  const lookup = new Map(enriched.map((t) => [t.videoId, t]));

  let sequenced: FlowTrack[] = [];
  let excluded: FlowTrack[] = [];
  let engineMetrics: Record<string, unknown> = {};

  switch (descriptor.engine) {
    case 'DRIFT': {
      const input: DriftTrack[] = enriched.map((t) => ({
        videoId: t.videoId,
        title: t.title,
        artist: t.artist,
        estimatedBpm: t.estimatedBpm,
        intensityScore: t.intensityScore,
        originalIndex: t.originalIndex ?? 0,
      }));
      const { tracks, harshTracks } = generateDriftPlaylist(input);
      sequenced = tracks.map((t) => toFlowTrack(t, lookup)).filter(Boolean) as FlowTrack[];
      excluded = harshTracks
        .map((t) => toFlowTrack(t, lookup, { reason: 'Outside the Drift vibe gate' }))
        .filter(Boolean) as FlowTrack[];
      break;
    }

    case 'RISE': {
      const input: RiseTrack[] = enriched.map((t) => ({
        id: t.videoId,
        title: t.title,
        artist: t.artist,
        bpm: t.estimatedBpm,
        intensity: t.intensityScore,
        arousal: t.intensityScore,
        energy: t.intensityScore,
        valence: t.valence,
        key: t.camelotKey,
      }));
      const output = processRiseAlgorithm(input);
      sequenced = output.sequencedTracks
        .map((t) => toFlowTrack(t, lookup, { segment: t.segment }))
        .filter(Boolean) as FlowTrack[];
      excluded = output.rejectedTracks
        .map((t) => toFlowTrack(t, lookup, { reason: 'Could not be placed on the ascent' }))
        .filter(Boolean) as FlowTrack[];
      engineMetrics = { ...output.metrics };
      break;
    }

    case 'FRAME': {
      const input: FrameTrack[] = enriched.map((t) => ({
        id: t.videoId,
        title: t.title,
        artist: t.artist,
        bpm: t.estimatedBpm,
        intensity: t.intensityScore,
        valence: t.valence ?? 0.5,
      }));
      const output = processFrameAlgorithm(input);
      sequenced = output.acceptedTracks
        .map((t) => toFlowTrack(t, lookup, { segment: t.act }))
        .filter(Boolean) as FlowTrack[];
      excluded = output.rejectedTracks
        .map((r) => toFlowTrack(r.track as Record<string, any>, lookup, { reason: r.reason }))
        .filter(Boolean) as FlowTrack[];
      engineMetrics = { ...output.metrics };
      break;
    }

    case 'UNHINGED': {
      const input: Partial<UnhingedTrack>[] = enriched.map((t) => ({
        id: t.videoId,
        title: t.title,
        artist: t.artist,
        bpm: t.estimatedBpm,
        arousal: t.intensityScore,
        intensity: t.intensityScore,
        valence: t.valence,
        key: t.camelotKey,
      }));
      const output = processUnhingedAlgorithm(input);
      sequenced = output.sequencedTracks
        .map((t) => toFlowTrack(t, lookup, { segment: t.role }))
        .filter(Boolean) as FlowTrack[];
      excluded = output.rejectedTracks
        .map((r) => toFlowTrack(r.track as Record<string, any>, lookup, { reason: r.reason }))
        .filter(Boolean) as FlowTrack[];
      engineMetrics = { ...output.metrics, anchorLogs: output.anchorLogs };
      break;
    }
  }

  sequenced = applySequenceDeltas(sequenced);
  const metrics = computeFlowMetrics(sequenced);

  return {
    engine: descriptor.engine,
    mode,
    label: descriptor.label,
    message: descriptor.message,
    originalCount: enriched.length,
    acceptedCount: sequenced.length,
    filteredCount: excluded.length,
    smoothnessScore: metrics.smoothnessScore,
    metrics,
    engineMetrics,
    tracks: sequenced,
    harshTracks: excluded,
  };
}
