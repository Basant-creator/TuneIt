/**
 * Shared flow metrics (src/utils/flowMetrics.ts)
 *
 * Every engine (Rise, Drift, Frame, Unhinged) produces a different internal
 * metric bag. The frontend needs one comparable number per engine, so these
 * helpers recompute a common set of transition statistics from the *final*
 * sequence regardless of which engine produced it.
 */

export interface FlowMetricInput {
  estimatedBpm: number;
  intensityScore: number;
}

export interface FlowMetrics {
  /** 100 - mean(|ΔE|) * 100, clamped to [0, 100]. Higher is smoother. */
  smoothnessScore: number;
  /** Mean absolute energy delta between consecutive tracks. */
  meanDeltaEnergy: number;
  /** Largest absolute energy delta in the sequence. */
  maxDeltaEnergy: number;
  /** Transitions where |ΔE| > 0.35 — the jarring cuts TuneIt exists to remove. */
  jarringCount: number;
  /** Mean absolute BPM delta between consecutive tracks. */
  meanBpmDelta: number;
  /** OLS regression slope of energy over position. Positive = builds up. */
  energySlope: number;
  /** Per-track energy curve, ready to plot. */
  energyCurve: number[];
}

const JARRING_THRESHOLD = 0.35;

/**
 * Recomputes comparable transition metrics for any finished sequence.
 */
export function computeFlowMetrics(tracks: FlowMetricInput[]): FlowMetrics {
  const energies = tracks.map((t) =>
    Math.max(0, Math.min(1, Number.isFinite(t.intensityScore) ? t.intensityScore : 0.5))
  );
  const bpms = tracks.map((t) => (Number.isFinite(t.estimatedBpm) ? t.estimatedBpm : 120));
  const n = energies.length;

  if (n < 2) {
    return {
      smoothnessScore: 100,
      meanDeltaEnergy: 0,
      maxDeltaEnergy: 0,
      jarringCount: 0,
      meanBpmDelta: 0,
      energySlope: 0,
      energyCurve: energies.map((e) => Number(e.toFixed(4))),
    };
  }

  let totalAbsDelta = 0;
  let totalBpmDelta = 0;
  let maxDeltaEnergy = 0;
  let jarringCount = 0;

  for (let i = 0; i < n - 1; i++) {
    const absDelta = Math.abs(energies[i + 1] - energies[i]);
    totalAbsDelta += absDelta;
    totalBpmDelta += Math.abs(bpms[i + 1] - bpms[i]);
    if (absDelta > maxDeltaEnergy) maxDeltaEnergy = absDelta;
    if (absDelta > JARRING_THRESHOLD) jarringCount++;
  }

  const meanDeltaEnergy = totalAbsDelta / (n - 1);

  // OLS slope of energy against position.
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
  const denominator = n * sumX2 - sumX * sumX;
  const energySlope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;

  return {
    smoothnessScore: Math.max(0, Number((100 - meanDeltaEnergy * 100).toFixed(2))),
    meanDeltaEnergy: Number(meanDeltaEnergy.toFixed(4)),
    maxDeltaEnergy: Number(maxDeltaEnergy.toFixed(4)),
    jarringCount,
    meanBpmDelta: Number((totalBpmDelta / (n - 1)).toFixed(2)),
    energySlope: Number(energySlope.toFixed(6)),
    energyCurve: energies.map((e) => Number(e.toFixed(4))),
  };
}
