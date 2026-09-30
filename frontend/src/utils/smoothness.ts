/**
 * Flow smoothness, matching the backend's `computeFlowMetrics`
 * (backend/src/utils/flowMetrics.ts): 100 - mean(|ΔE|) * 100.
 *
 * Kept identical on purpose, so a score shown on the marketing page means the
 * same thing as the score the real engine reports for a user's playlist.
 */
export function smoothnessScore(energies: number[]): number {
  if (energies.length < 2) return 100;
  let total = 0;
  for (let i = 0; i < energies.length - 1; i++) {
    total += Math.abs(energies[i + 1] - energies[i]);
  }
  const mean = total / (energies.length - 1);
  return Math.max(0, Number((100 - mean * 100).toFixed(1)));
}
