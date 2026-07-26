import fs from 'fs';
import path from 'path';
import { processFrameAlgorithm, computeSmoothnessScore, getTrackEnergy, computeMean, Track, AcceptedTrack } from '../src/utils/frameAlgorithm';

interface BenchmarkResult {
  engineName: string;
  totalTracks: number;
  acceptedTracks: number;
  rejectedTracks: number;
  yieldRetention: string;
  meanDelta: number;
  maxDelta: number;
  jarringTransitionsCount: number; // Jump > 0.35
  smoothnessScore: number;         // 100 - (meanDelta * 100)
}

function computeMetrics(engineName: string, tracks: Track[], rejectedCount: number): BenchmarkResult {
  const total = tracks.length + rejectedCount;
  const retentionPct = total > 0 ? ((tracks.length / total) * 100).toFixed(1) + '%' : '0%';

  if (tracks.length < 2) {
    return {
      engineName,
      totalTracks: total,
      acceptedTracks: tracks.length,
      rejectedTracks: rejectedCount,
      yieldRetention: retentionPct,
      meanDelta: 0,
      maxDelta: 0,
      jarringTransitionsCount: 0,
      smoothnessScore: 100
    };
  }

  let totalDelta = 0;
  let maxDelta = 0;
  let jarringCount = 0;

  for (let i = 0; i < tracks.length - 1; i++) {
    const current = getTrackEnergy(tracks[i]);
    const next = getTrackEnergy(tracks[i + 1]);
    const delta = Math.abs(next - current);

    totalDelta += delta;
    if (delta > maxDelta) maxDelta = delta;
    if (delta > 0.35) jarringCount++;
  }

  const meanDelta = totalDelta / (tracks.length - 1);
  const smoothnessScore = Math.max(0, Number((100 - meanDelta * 100).toFixed(2)));

  return {
    engineName,
    totalTracks: total,
    acceptedTracks: tracks.length,
    rejectedTracks: rejectedCount,
    yieldRetention: retentionPct,
    meanDelta: Number(meanDelta.toFixed(4)),
    maxDelta: Number(maxDelta.toFixed(4)),
    jarringTransitionsCount: jarringCount,
    smoothnessScore
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderAsciiTrajectoryMap(acceptedTracks: AcceptedTrack[]): string {
  if (acceptedTracks.length === 0) return 'Empty sequence';

  return acceptedTracks
    .map((track, idx) => {
      const trackNumStr = (idx + 1).toString().padStart(2, '0');
      const actTag = track.act.padEnd(7, ' ');
      const energy = getTrackEnergy(track);
      const barLength = Math.round(energy * 20);
      const bar = '█'.repeat(barLength).padEnd(20, '░');
      const titleStr = `${track.artist} - ${track.title}`.padEnd(42, ' ');
      const energyStr = energy.toFixed(2);

      return ` [${actTag}] [Track #${trackNumStr}] | ${bar} | Energy: ${energyStr} | ${titleStr}`;
    })
    .join('\n');
}

function runFrameEngineEvaluation() {
  console.log('\n========================================================================');
  console.log('       🎬 TUNEIT FRAME ENGINE (SYSTEM SPECIFICATION BENCHMARK) 🎬        ');
  console.log('========================================================================\n');

  const fixturePath = path.join(__dirname, '..', 'tests', 'fixtures', 'musav_30.json');
  if (!fs.existsSync(fixturePath)) {
    console.error(`❌ Error: Benchmark dataset fixture not found at ${fixturePath}`);
    process.exit(1);
  }

  const rawTracks: Track[] = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  console.log(`Loaded ${rawTracks.length} tracks from track pool benchmark.\n`);

  // 1. Reference: Original Unsorted Benchmark
  const originalMetrics = computeMetrics('Original Order (Unsorted)', rawTracks, 0);

  // 2. Reference: Random Shuffle Benchmark (averaged over 10 runs)
  let randomDeltas = 0;
  let randomMaxDelta = 0;
  let randomJarring = 0;
  const RUNS = 10;
  for (let r = 0; r < RUNS; r++) {
    const shuffled = shuffleArray(rawTracks);
    const m = computeMetrics('Random', shuffled, 0);
    randomDeltas += m.meanDelta;
    randomMaxDelta = Math.max(randomMaxDelta, m.maxDelta);
    randomJarring += m.jarringTransitionsCount;
  }
  const avgRandomMetrics: BenchmarkResult = {
    engineName: 'Random Shuffle (10x Avg)',
    totalTracks: rawTracks.length,
    acceptedTracks: rawTracks.length,
    rejectedTracks: 0,
    yieldRetention: '100%',
    meanDelta: Number((randomDeltas / RUNS).toFixed(4)),
    maxDelta: Number(randomMaxDelta.toFixed(4)),
    jarringTransitionsCount: Math.round(randomJarring / RUNS),
    smoothnessScore: Number((100 - (randomDeltas / RUNS) * 100).toFixed(2))
  };

  // 3. TuneIt Frame Algorithm Pipeline
  const output = processFrameAlgorithm(rawTracks);
  const frameMetrics = computeMetrics(
    'TuneIt Frame Engine (Cinematic)',
    output.acceptedTracks,
    output.rejectedTracks.length
  );

  // Print Standard Benchmark Metrics Summary Table
  console.log('--- BENCHMARK METRICS SUMMARY ---');
  console.table([
    {
      Engine: originalMetrics.engineName,
      'Accepted / Total': `${originalMetrics.acceptedTracks}/${originalMetrics.totalTracks}`,
      'Yield Retention': originalMetrics.yieldRetention,
      'Mean Δ Energy': originalMetrics.meanDelta,
      'Max Δ Energy': originalMetrics.maxDelta,
      'Jarring Jumps (>0.35)': originalMetrics.jarringTransitionsCount,
      'Smoothness Score': `${originalMetrics.smoothnessScore} / 100`
    },
    {
      Engine: avgRandomMetrics.engineName,
      'Accepted / Total': `${avgRandomMetrics.acceptedTracks}/${avgRandomMetrics.totalTracks}`,
      'Yield Retention': avgRandomMetrics.yieldRetention,
      'Mean Δ Energy': avgRandomMetrics.meanDelta,
      'Max Δ Energy': avgRandomMetrics.maxDelta,
      'Jarring Jumps (>0.35)': avgRandomMetrics.jarringTransitionsCount,
      'Smoothness Score': `${avgRandomMetrics.smoothnessScore} / 100`
    },
    {
      Engine: frameMetrics.engineName,
      'Accepted / Total': `${frameMetrics.acceptedTracks}/${frameMetrics.totalTracks}`,
      'Yield Retention': frameMetrics.yieldRetention,
      'Mean Δ Energy': frameMetrics.meanDelta,
      'Max Δ Energy': frameMetrics.maxDelta,
      'Jarring Jumps (>0.35)': frameMetrics.jarringTransitionsCount,
      'Smoothness Score': `${frameMetrics.smoothnessScore} / 100`
    }
  ]);

  // Print Rejected Tracks Log
  if (output.rejectedTracks.length > 0) {
    console.log('\n--- 🚫 REJECTION FILTER LOG (HARD GATES) ---');
    console.log(`Tracks isolated/rejected by Hard Gates: ${output.rejectedTracks.length}`);
    output.rejectedTracks.forEach((item, i) => {
      const energy = getTrackEnergy(item.track);
      console.log(
        `  ❌ Rejected: "${item.track.artist} - ${item.track.title}" | BPM: ${item.track.bpm} | Energy: ${energy.toFixed(2)} -> Reason: ${item.reason}`
      );
    });
  }

  // Print ASCII Energy Trajectory Map
  console.log('\n--- 🗺️ TUNEIT FRAME SEQUENCED OUTPUT ENERGY TRAJECTORY MAP ---');
  console.log(renderAsciiTrajectoryMap(output.acceptedTracks));

  // --- System Specification Validation Suite ---
  console.log('\n--- 🧪 SYSTEM SPECIFICATION VERIFICATION SUITE ---');

  const retentionPctVal = (output.acceptedTracks.length / rawTracks.length) * 100;
  const isYieldTargetMet = retentionPctVal >= 75.0;

  const act1Tracks = output.acceptedTracks.filter(t => t.act === 'ACT_I');
  const act1Deviations = act1Tracks.map(t => Math.abs(getTrackEnergy(t) - output.metrics.baselineIntensity));
  const maxAct1Deviation = Math.max(...act1Deviations, 0);

  const act3Tracks = output.acceptedTracks.filter(t => t.act === 'ACT_III');
  let isAct3StrictlyMonotonic = true;
  for (let i = 0; i < act3Tracks.length - 1; i++) {
    const e1 = getTrackEnergy(act3Tracks[i]);
    const e2 = getTrackEnergy(act3Tracks[i + 1]);
    if (e2 > e1 + 0.0001) {
      isAct3StrictlyMonotonic = false; // Upward energy spike in Act III!
    }
  }

  const cond1Passed = output.metrics.maxDeltaEnergy <= 0.28;
  const cond2Passed = output.metrics.jarringJumps === 0;
  const cond3Passed = output.metrics.smoothnessScore >= 93.0;
  const cond4Passed = isYieldTargetMet;
  const cond5Passed = maxAct1Deviation <= 0.10;
  const cond6Passed = isAct3StrictlyMonotonic;

  console.log(
    ` ${cond1Passed ? '✅' : '❌'} Check 1: Step Cap (Max ΔE ≤ 0.28) -> Max ΔE = ${output.metrics.maxDeltaEnergy.toFixed(4)}`
  );
  console.log(
    ` ${cond2Passed ? '✅' : '❌'} Check 2: Zero Jarring Jumps (> 0.35) -> Jumps Count = ${output.metrics.jarringJumps}`
  );
  console.log(
    ` ${cond3Passed ? '✅' : '❌'} Check 3: Smoothness Score Target (≥ 93.0 / 100) -> Score = ${output.metrics.smoothnessScore} / 100`
  );
  console.log(
    ` ${cond4Passed ? '✅' : '❌'} Check 4: Yield Retention Target (≥ 75%) -> Actual Yield = ${retentionPctVal.toFixed(1)}% (${output.acceptedTracks.length}/${rawTracks.length})`
  );
  console.log(
    ` ${cond5Passed ? '✅' : '❌'} Check 5: Act I Exposition Baseline Anchor (Max Dev ≤ 0.10) -> Max Dev = ${maxAct1Deviation.toFixed(4)}`
  );
  console.log(
    ` ${cond6Passed ? '✅' : '❌'} Check 6: Act III Resolution Monotonicity Guardrail (E_k ≤ E_{k-1}) -> ${isAct3StrictlyMonotonic ? 'Strictly Non-Increasing' : 'VIOLATION DETECTED'}`
  );

  const deltaImprovement = (((avgRandomMetrics.meanDelta - frameMetrics.meanDelta) / avgRandomMetrics.meanDelta) * 100).toFixed(1);
  const smoothnessGain = (frameMetrics.smoothnessScore - avgRandomMetrics.smoothnessScore).toFixed(1);

  console.log('\n========================================================================');
  console.log(`✨ VERDICT: TuneIt Frame Engine reduced transition friction by ${deltaImprovement}%`);
  console.log(`✨ Smoothness Score improved by +${smoothnessGain} points over random ordering!`);
  console.log('========================================================================\n');
}

runFrameEngineEvaluation();
