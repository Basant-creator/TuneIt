import fs from 'fs';
import path from 'path';
import {
  processRiseAlgorithm,
  calculateRiseMetrics,
  checkEveryWindowHasDip,
  RiseTrack,
  SequencedRiseTrack,
  RiseEngineOutput
} from '../src/utils/riseAlgorithm';

declare const describe: any;
declare const it: any;
declare const expect: any;

// Standalone execution runner logic
let testPassedCount = 0;
let testFailedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    testFailedCount++;
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    testPassedCount++;
    console.log(`  ✅ PASS: ${message}`);
  }
}

export function runRiseEngineBenchmarkSuite() {
  console.log('\n========================================================================================');
  console.log('         🚀 TUNEIT RISE ALGORITHM BENCHMARK ASSERTION TEST SUITE 🚀         ');
  console.log('========================================================================================\n');

  // Load datasets
  const customPath = path.join(__dirname, '..', 'scripts', 'customUserPlaylist.json');
  const jamendoPath = path.join(__dirname, 'fixtures', 'mtg_jamendo_dataset.json');
  const musavPath = path.join(__dirname, 'fixtures', 'musav_30.json');

  const customTracks: RiseTrack[] = fs.existsSync(customPath) ? JSON.parse(fs.readFileSync(customPath, 'utf-8')) : [];
  const jamendoTracks: RiseTrack[] = fs.existsSync(jamendoPath) ? JSON.parse(fs.readFileSync(jamendoPath, 'utf-8')) : [];
  const musavTracks: RiseTrack[] = fs.existsSync(musavPath) ? JSON.parse(fs.readFileSync(musavPath, 'utf-8')) : [];

  const datasets = [
    { name: 'Custom User Playlist (N=20)', pool: customTracks },
    { name: 'MTG Jamendo Dataset (N=40)', pool: jamendoTracks },
    { name: 'MusAV Dataset (N=30)', pool: musavTracks }
  ];

  for (const ds of datasets) {
    if (ds.pool.length === 0) continue;

    console.log(`\n📋 Testing Dataset: ${ds.name} [${ds.pool.length} tracks]`);
    const output: RiseEngineOutput = processRiseAlgorithm(ds.pool);
    const { sequencedTracks, metrics } = output;

    // 1. Ascent Verification: Slope regression over E(t) must be positive and strong (m > 0.0010)
    assert(
      metrics.slope > 0.0010,
      `Ascent Verification: Slope regression m (${metrics.slope}) must be > 0.0010`
    );

    // 2. Variance Check: Count(ΔE < 0) >= 1 for every 6 consecutive tracks
    const windowDipPass = checkEveryWindowHasDip(sequencedTracks, 6);
    assert(
      windowDipPass,
      `Variance Check: Count(ΔE < 0) >= 1 for every 6 consecutive tracks`
    );

    // 3. Max Step Limit: No transition jump can exceed ΔE > 0.35 (Jarring Jump count is 0)
    assert(
      metrics.jarringCount === 0 && metrics.maxDeltaEnergy <= 0.35,
      `Max Step Limit: Jarring Jump count must be 0 (Max ΔE: ${metrics.maxDeltaEnergy} <= 0.35)`
    );

    // 4. Setup Smoothness: Smoothness Score >= 94.0 / 100
    assert(
      metrics.smoothnessScore >= 94.0,
      `Setup Smoothness: Smoothness Score (${metrics.smoothnessScore}) must be >= 94.0 / 100`
    );

    // 5. Segment Medians Monotonic Ascent Check
    const medians = metrics.segmentMedians;
    assert(
      medians.ENTRY <= medians.ACT_I &&
      medians.ACT_I <= medians.ACT_II &&
      medians.ACT_II <= medians.ACT_III &&
      medians.ACT_III < medians.PEAK,
      `Segment Medians Monotonic Ascent: Entry (${medians.ENTRY}) <= Act I (${medians.ACT_I}) <= Act II (${medians.ACT_II}) <= Act III (${medians.ACT_III}) < Peak (${medians.PEAK})`
    );
  }

  console.log('\n========================================================================================');
  console.log(`🎉 BENCHMARK SUITE COMPLETED: ${testPassedCount} assertions passed, ${testFailedCount} failed.`);
  console.log('========================================================================================\n');
}

// Support standard Jest environment if run via jest
if (typeof describe !== 'undefined') {
  describe('Rise Algorithm Benchmark Assertion Suite', () => {
    const customPath = path.join(__dirname, '..', 'scripts', 'customUserPlaylist.json');
    const customTracks: RiseTrack[] = JSON.parse(fs.readFileSync(customPath, 'utf-8'));

    it('should satisfy Ascent Verification (m > 0.0010)', () => {
      const output = processRiseAlgorithm(customTracks);
      expect(output.metrics.slope).toBeGreaterThan(0.0010);
    });

    it('should satisfy Variance Check (Count(ΔE < 0) >= 1 for every 6 tracks)', () => {
      const output = processRiseAlgorithm(customTracks);
      expect(checkEveryWindowHasDip(output.sequencedTracks, 6)).toBe(true);
    });

    it('should satisfy Max Step Limit (Max ΔE <= 0.35, Jarring Count == 0)', () => {
      const output = processRiseAlgorithm(customTracks);
      expect(output.metrics.jarringCount).toBe(0);
      expect(output.metrics.maxDeltaEnergy).toBeLessThanOrEqual(0.35);
    });

    it('should satisfy Setup Smoothness (Score >= 94.0 / 100)', () => {
      const output = processRiseAlgorithm(customTracks);
      expect(output.metrics.smoothnessScore).toBeGreaterThanOrEqual(94.0);
    });
  });
}

// Standalone execution entrypoint when run via ts-node directly
if (require.main === module) {
  runRiseEngineBenchmarkSuite();
}
