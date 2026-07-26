import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { processFrameAlgorithm, getTrackEnergy, Track as FrameTrack } from '../src/utils/frameAlgorithm';
import { generateDriftPlaylist, DriftTrack } from '../src/utils/driftAlgorithm';

interface ScaleResult {
  engineName: string;
  poolSize: number;
  acceptedTracks: number;
  rejectedTracks: number;
  retentionPct: string;
  executionTimeMs: number;
  throughputPerSec: number;
  meanDelta: number;
  maxDelta: number;
  jarringJumps: number;
  smoothnessScore: number;
}

function generateScaledPool(baseTracks: FrameTrack[], targetSize: number): FrameTrack[] {
  const result: FrameTrack[] = [];
  let idCounter = 1;

  while (result.length < targetSize) {
    for (const item of baseTracks) {
      if (result.length >= targetSize) break;
      const bpmVar = Math.max(50, Math.min(200, item.bpm + (Math.random() * 6 - 3)));
      const energyVar = Math.max(0.05, Math.min(0.95, item.intensity + (Math.random() * 0.04 - 0.02)));

      result.push({
        id: `mtg_${idCounter.toString().padStart(5, '0')}`,
        title: `${item.title} (Variant ${Math.ceil(idCounter / baseTracks.length)})`,
        artist: item.artist,
        bpm: Number(bpmVar.toFixed(1)),
        intensity: Number(energyVar.toFixed(4)),
        valence: item.valence
      });
      idCounter++;
    }
  }

  return result;
}

function evaluateFrameOnPool(pool: FrameTrack[], engineLabel: string): ScaleResult {
  const start = performance.now();
  const output = processFrameAlgorithm(pool);
  const end = performance.now();

  const executionTimeMs = Number((end - start).toFixed(2));
  const throughputPerSec = Math.round((pool.length / (executionTimeMs || 1)) * 1000);

  const accepted = output.acceptedTracks;
  const rejectedCount = output.rejectedTracks.length;
  const retentionPct = ((accepted.length / pool.length) * 100).toFixed(1) + '%';

  let totalDelta = 0;
  let maxDelta = 0;
  let jarringJumps = 0;

  for (let i = 0; i < accepted.length - 1; i++) {
    const d = Math.abs(getTrackEnergy(accepted[i + 1]) - getTrackEnergy(accepted[i]));
    totalDelta += d;
    if (d > maxDelta) maxDelta = d;
    if (d > 0.35) jarringJumps++;
  }

  const meanDelta = accepted.length > 1 ? totalDelta / (accepted.length - 1) : 0;
  const smoothnessScore = Math.max(0, Number((100 - meanDelta * 100).toFixed(2)));

  return {
    engineName: engineLabel,
    poolSize: pool.length,
    acceptedTracks: accepted.length,
    rejectedTracks: rejectedCount,
    retentionPct,
    executionTimeMs,
    throughputPerSec,
    meanDelta: Number(meanDelta.toFixed(4)),
    maxDelta: Number(maxDelta.toFixed(4)),
    jarringJumps,
    smoothnessScore
  };
}

function evaluateDriftOnPool(pool: FrameTrack[], engineLabel: string): ScaleResult {
  const driftInput: DriftTrack[] = pool.map((t, idx) => ({
    videoId: t.id,
    title: t.title,
    artist: t.artist,
    estimatedBpm: t.bpm,
    intensityScore: t.intensity,
    originalIndex: idx
  }));

  const start = performance.now();
  const result = generateDriftPlaylist(driftInput);
  const end = performance.now();

  const executionTimeMs = Number((end - start).toFixed(2));
  const throughputPerSec = Math.round((pool.length / (executionTimeMs || 1)) * 1000);

  const accepted = result.tracks;
  const rejectedCount = result.harshTracks.length;
  const retentionPct = ((accepted.length / pool.length) * 100).toFixed(1) + '%';

  let totalDelta = 0;
  let maxDelta = 0;
  let jarringJumps = 0;

  for (let i = 0; i < accepted.length - 1; i++) {
    const d = Math.abs(accepted[i + 1].intensityScore - accepted[i].intensityScore);
    totalDelta += d;
    if (d > maxDelta) maxDelta = d;
    if (d > 0.35) jarringJumps++;
  }

  const meanDelta = accepted.length > 1 ? totalDelta / (accepted.length - 1) : 0;
  const smoothnessScore = Math.max(0, Number((100 - meanDelta * 100).toFixed(2)));

  return {
    engineName: engineLabel,
    poolSize: pool.length,
    acceptedTracks: accepted.length,
    rejectedTracks: rejectedCount,
    retentionPct,
    executionTimeMs,
    throughputPerSec,
    meanDelta: Number(meanDelta.toFixed(4)),
    maxDelta: Number(maxDelta.toFixed(4)),
    jarringJumps,
    smoothnessScore
  };
}

function runMTGJamendoEvaluation() {
  console.log('\n====================================================================================');
  console.log('       🎼 TUNEIT HIGH-SCALE MTG-JAMENDO DATASET BENCHMARK & PERFORMANCE 🎼        ');
  console.log('====================================================================================\n');

  const fixturePath = path.join(__dirname, '..', 'tests', 'fixtures', 'mtg_jamendo_dataset.json');
  if (!fs.existsSync(fixturePath)) {
    console.error(`❌ Error: MTG-Jamendo dataset fixture not found at ${fixturePath}`);
    process.exit(1);
  }

  const baseTracks: FrameTrack[] = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  console.log(`📥 Loaded base MTG-Jamendo dataset fixture (${baseTracks.length} tracks).\n`);

  const SCALES = [50, 200, 500, 1000];

  // 1. FRAME ENGINE SCALE EVALUATION
  console.log('--- 🎬 1. TUNEIT FRAME ENGINE SCALE EVALUATION (MTG-JAMENDO) ---');
  const frameScaleResults: ScaleResult[] = [];
  for (const scale of SCALES) {
    const pool = generateScaledPool(baseTracks, scale);
    const res = evaluateFrameOnPool(pool, `Frame Engine (N=${scale})`);
    frameScaleResults.push(res);
  }

  console.table(
    frameScaleResults.map(r => ({
      'Track Pool Size (N)': r.poolSize,
      'Accepted / Total': `${r.acceptedTracks} / ${r.poolSize}`,
      'Yield Retention': r.retentionPct,
      'Execution Time': `${r.executionTimeMs} ms`,
      'Throughput': `${r.throughputPerSec.toLocaleString()} tracks/sec`,
      'Mean Δ Energy': r.meanDelta,
      'Max Δ Energy': r.maxDelta,
      'Jarring Jumps (>0.35)': r.jarringJumps,
      'Smoothness Score': `${r.smoothnessScore} / 100`
    }))
  );

  // 2. MENTAL DRIFT ENGINE SCALE EVALUATION
  console.log('\n--- 🌊 2. TUNEIT MENTAL DRIFT ENGINE SCALE EVALUATION (MTG-JAMENDO) ---');
  const driftScaleResults: ScaleResult[] = [];
  for (const scale of SCALES) {
    const pool = generateScaledPool(baseTracks, scale);
    const res = evaluateDriftOnPool(pool, `Drift Engine (N=${scale})`);
    driftScaleResults.push(res);
  }

  console.table(
    driftScaleResults.map(r => ({
      'Track Pool Size (N)': r.poolSize,
      'Accepted / Total': `${r.acceptedTracks} / ${r.poolSize}`,
      'Yield Retention': r.retentionPct,
      'Execution Time': `${r.executionTimeMs} ms`,
      'Throughput': `${r.throughputPerSec.toLocaleString()} tracks/sec`,
      'Mean Δ Energy': r.meanDelta,
      'Max Δ Energy': r.maxDelta,
      'Jarring Jumps (>0.35)': r.jarringJumps,
      'Smoothness Score': `${r.smoothnessScore} / 100`
    }))
  );

  // 3. SIDE-BY-SIDE ENGINE COMPARISON AT N=500
  console.log('\n--- ⚡ 3. SIDE-BY-SIDE ENGINE COMPARISON AT N=500 SCALED PLAYLIST ---');
  const pool500 = generateScaledPool(baseTracks, 500);

  const frame500 = evaluateFrameOnPool(pool500, 'TuneIt Frame Engine (Cinematic)');
  const drift500 = evaluateDriftOnPool(pool500, 'TuneIt Mental Drift Engine');

  console.table([
    {
      Engine: frame500.engineName,
      'Accepted / Total': `${frame500.acceptedTracks} / 500`,
      'Yield Retention': frame500.retentionPct,
      'Execution Time': `${frame500.executionTimeMs} ms`,
      'Throughput': `${frame500.throughputPerSec.toLocaleString()} tracks/sec`,
      'Mean Δ Energy': frame500.meanDelta,
      'Max Δ Energy': frame500.maxDelta,
      'Jarring Jumps (>0.35)': frame500.jarringJumps,
      'Smoothness Score': `${frame500.smoothnessScore} / 100`
    },
    {
      Engine: drift500.engineName,
      'Accepted / Total': `${drift500.acceptedTracks} / 500`,
      'Yield Retention': drift500.retentionPct,
      'Execution Time': `${drift500.executionTimeMs} ms`,
      'Throughput': `${drift500.throughputPerSec.toLocaleString()} tracks/sec`,
      'Mean Δ Energy': drift500.meanDelta,
      'Max Δ Energy': drift500.maxDelta,
      'Jarring Jumps (>0.35)': drift500.jarringJumps,
      'Smoothness Score': `${drift500.smoothnessScore} / 100`
    }
  ]);

  console.log('\n====================================================================================');
  console.log(`🎬 FRAME ENGINE (N=1,000): Processed 1,000 tracks in ${frameScaleResults[3].executionTimeMs} ms (${frameScaleResults[3].throughputPerSec.toLocaleString()} tracks/sec) with ${frameScaleResults[3].retentionPct} retention!`);
  console.log(`🌊 DRIFT ENGINE (N=1,000): Processed 1,000 tracks in ${driftScaleResults[3].executionTimeMs} ms (${driftScaleResults[3].throughputPerSec.toLocaleString()} tracks/sec) with Max ΔE = ${driftScaleResults[3].maxDelta}!`);
  console.log('====================================================================================\n');
}

runMTGJamendoEvaluation();
