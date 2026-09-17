/**
 * Engine ↔ Frontend contract verification (scripts/verifyEngineContract.ts)
 *
 * Runs every flow engine through the same adapter the API uses and asserts the
 * invariants the frontend depends on:
 *
 *   1. Every engine is reachable through `runFlowEngine`.
 *   2. Every returned track carries a non-empty `videoId` (export would break
 *      silently otherwise — this was the bug that made Frame/Unhinged unusable).
 *   3. No track is duplicated or invented; every id traces back to the input.
 *   4. `acceptedCount` + `filteredCount` accounting is consistent.
 *   5. Numeric fields are finite and in range, so the UI never renders NaN.
 *   6. Metrics are comparable across engines (same shape, same scale).
 *
 * Run with:  npm run verify:engines
 */

import {
  runFlowEngine,
  SUPPORTED_MODES,
  ENGINE_BY_MODE,
  EnrichedTrack,
  FlowEngineResponse,
} from '../src/services/flowEngineService';

interface Failure {
  mode: string;
  check: string;
  detail: string;
}

const failures: Failure[] = [];
let checksRun = 0;

function check(mode: string, name: string, condition: boolean, detail: string): void {
  checksRun++;
  if (!condition) failures.push({ mode, check: name, detail });
}

/** Deterministic synthetic playlist, so runs are reproducible. */
function buildPool(size: number, seed = 7): EnrichedTrack[] {
  let state = seed;
  const rand = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };

  return Array.from({ length: size }, (_, i) => ({
    videoId: `vid_${String(i).padStart(4, '0')}`,
    title: `Track ${i + 1}`,
    artist: `Artist ${(i % 11) + 1}`,
    estimatedBpm: Math.round(70 + rand() * 90),
    intensityScore: Number(rand().toFixed(2)),
    originalIndex: i,
  }));
}

function verify(mode: (typeof SUPPORTED_MODES)[number], pool: EnrichedTrack[]): FlowEngineResponse {
  const result = runFlowEngine(mode, pool);
  const inputIds = new Set(pool.map((t) => t.videoId));
  const descriptor = ENGINE_BY_MODE[mode];

  check(mode, 'engine-name', result.engine === descriptor.engine, `expected ${descriptor.engine}, got ${result.engine}`);
  check(mode, 'produces-tracks', result.tracks.length > 0, 'engine returned an empty sequence');

  // 2 + 3: identity integrity.
  const seen = new Set<string>();
  for (const [idx, track] of result.tracks.entries()) {
    check(mode, 'videoId-present', !!track.videoId, `track at index ${idx} has no videoId`);
    check(mode, 'videoId-known', inputIds.has(track.videoId), `unknown videoId "${track.videoId}" at index ${idx}`);
    check(mode, 'no-duplicates', !seen.has(track.videoId), `duplicate videoId "${track.videoId}" at index ${idx}`);
    seen.add(track.videoId);

    // 5: renderable numbers.
    check(
      mode,
      'bpm-finite',
      Number.isFinite(track.estimatedBpm) && track.estimatedBpm > 0,
      `bad estimatedBpm ${track.estimatedBpm} at index ${idx}`
    );
    check(
      mode,
      'intensity-in-range',
      Number.isFinite(track.intensityScore) && track.intensityScore >= 0 && track.intensityScore <= 1,
      `bad intensityScore ${track.intensityScore} at index ${idx}`
    );
    check(mode, 'title-present', !!track.title, `empty title at index ${idx}`);
    check(mode, 'artist-present', !!track.artist, `empty artist at index ${idx}`);
  }

  for (const [idx, track] of result.harshTracks.entries()) {
    check(mode, 'excluded-videoId', !!track.videoId, `excluded track at index ${idx} has no videoId`);
    check(mode, 'excluded-known', inputIds.has(track.videoId), `unknown excluded videoId at index ${idx}`);
    check(mode, 'excluded-not-in-sequence', !seen.has(track.videoId), `track "${track.videoId}" is both kept and excluded`);
  }

  // 4: accounting.
  check(mode, 'accepted-count', result.acceptedCount === result.tracks.length, `acceptedCount ${result.acceptedCount} != ${result.tracks.length}`);
  check(mode, 'filtered-count', result.filteredCount === result.harshTracks.length, `filteredCount ${result.filteredCount} != ${result.harshTracks.length}`);
  check(mode, 'original-count', result.originalCount === pool.length, `originalCount ${result.originalCount} != ${pool.length}`);
  check(
    mode,
    'no-track-inflation',
    result.acceptedCount + result.filteredCount <= pool.length,
    `kept+excluded (${result.acceptedCount + result.filteredCount}) exceeds input (${pool.length})`
  );

  // 6: comparable metrics.
  const m = result.metrics;
  check(mode, 'smoothness-range', m.smoothnessScore >= 0 && m.smoothnessScore <= 100, `smoothnessScore ${m.smoothnessScore}`);
  check(mode, 'metrics-finite', [m.meanDeltaEnergy, m.maxDeltaEnergy, m.meanBpmDelta, m.energySlope].every(Number.isFinite), 'non-finite metric value');
  check(mode, 'energy-curve-length', m.energyCurve.length === result.tracks.length, `curve length ${m.energyCurve.length} != ${result.tracks.length}`);
  check(mode, 'smoothness-mirrors-response', result.smoothnessScore === m.smoothnessScore, 'top-level smoothnessScore disagrees with metrics');
  check(mode, 'delta-on-first-track', result.tracks[0]?.deltaEnergy === 0, 'first track should have deltaEnergy 0');

  return result;
}

function main(): void {
  const poolSizes = [1, 2, 4, 5, 12, 21, 80];

  console.log('TuneIt — Engine ↔ Frontend contract verification');
  console.log('='.repeat(78));

  for (const size of poolSizes) {
    const pool = buildPool(size);
    const row: string[] = [];

    for (const mode of SUPPORTED_MODES) {
      const before = failures.length;
      const result = verify(mode, pool);
      const ok = failures.length === before;
      row.push(
        `${ENGINE_BY_MODE[mode].label.padEnd(9)} ${String(result.acceptedCount).padStart(3)}/${String(size).padEnd(3)} ` +
          `sm=${String(result.smoothnessScore).padStart(6)} jar=${String(result.metrics.jarringCount).padStart(2)} ${ok ? 'OK' : 'FAIL'}`
      );
    }

    console.log(`\nPool size ${size}:`);
    row.forEach((r) => console.log(`  ${r}`));
  }

  // Empty pool must not throw.
  for (const mode of SUPPORTED_MODES) {
    try {
      const empty = runFlowEngine(mode, []);
      check(mode, 'empty-pool', empty.tracks.length === 0, 'empty input produced tracks');
    } catch (err: any) {
      check(mode, 'empty-pool', false, `threw on empty input: ${err?.message}`);
    }
  }

  console.log('\n' + '='.repeat(78));
  if (failures.length === 0) {
    console.log(`✅ All ${checksRun} contract checks passed across ${SUPPORTED_MODES.length} engines.`);
    process.exit(0);
  }

  console.log(`❌ ${failures.length} of ${checksRun} checks failed:\n`);
  for (const f of failures.slice(0, 40)) {
    console.log(`  [${f.mode}] ${f.check}: ${f.detail}`);
  }
  if (failures.length > 40) console.log(`  ...and ${failures.length - 40} more`);
  process.exit(1);
}

main();
