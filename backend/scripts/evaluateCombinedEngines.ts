import fs from 'fs';
import path from 'path';
import { generateDriftPlaylist, DriftTrack } from '../src/utils/driftAlgorithm';
import { processFrameEngine, Track as FrameTrack } from '../src/utils/frameAlgorithm';
import { processUnhingedAlgorithm, Track as UnhingedTrack } from '../src/utils/unhingedAlgorithm';
import { processRiseAlgorithm, RiseTrack } from '../src/utils/riseAlgorithm';

interface InputTrack {
  id: string;
  videoId?: string;
  title: string;
  artist: string;
  bpm: number;
  estimatedBpm?: number;
  intensity?: number;
  intensityScore?: number;
  arousal?: number;
  valence?: number;
  genre?: string;
  key?: string;
  subBassDensity?: number;
}

function renderTrajectoryMap(title: string, tracks: any[], getEnergy: (t: any) => number): string {
  if (tracks.length === 0) return `${title}\n  (No tracks output)\n`;
  
  const lines = tracks.map((t, idx) => {
    const energy = getEnergy(t);
    const barLength = Math.max(0, Math.min(20, Math.round(energy * 20)));
    const bar = '█'.repeat(barLength).padEnd(20, '░');
    const bpm = t.bpm || t.estimatedBpm || 120;
    const actOrRole = t.segment ? ` [${t.segment}]` : t.act ? ` [${t.act}]` : t.role ? ` [${t.role}]` : '';
    return `  [${(idx + 1).toString().padStart(2, '0')}] ${bar} | E: ${energy.toFixed(2)} | ${bpm.toString().padStart(3, ' ')} BPM | ${t.artist} - ${t.title}${actOrRole}`;
  });

  return `--- ${title} ---\n` + lines.join('\n');
}

function computeMetrics(tracks: any[], getEnergy: (t: any) => number, rejectedCount: number) {
  if (tracks.length < 2) {
    return {
      acceptedTracks: tracks.length,
      rejectedTracks: rejectedCount,
      meanDelta: 0,
      maxDelta: 0,
      jarringCount: 0,
      smoothnessScore: 100
    };
  }

  let totalDelta = 0;
  let maxDelta = 0;
  let jarringCount = 0;

  for (let i = 0; i < tracks.length - 1; i++) {
    const delta = Math.abs(getEnergy(tracks[i + 1]) - getEnergy(tracks[i]));
    totalDelta += delta;
    if (delta > maxDelta) maxDelta = delta;
    if (delta > 0.35) jarringCount++;
  }

  const meanDelta = totalDelta / (tracks.length - 1);
  const smoothnessScore = Math.max(0, Number((100 - meanDelta * 100).toFixed(2)));

  return {
    acceptedTracks: tracks.length,
    rejectedTracks: rejectedCount,
    meanDelta: Number(meanDelta.toFixed(4)),
    maxDelta: Number(maxDelta.toFixed(4)),
    jarringCount,
    smoothnessScore
  };
}

function runCombinedEvaluation() {
  console.log('\n========================================================================================');
  console.log('       🎵 TUNEIT ALL-ALGORITHMS COMBINED SEQUENCING BENCHMARK & COMPARISON 🎵          ');
  console.log('========================================================================================\n');

  // Check command line arg for dataset path or default to customUserPlaylist.json
  const argPath = process.argv[2];
  const defaultPath = path.join(__dirname, 'customUserPlaylist.json');
  const fallbackPath = path.join(__dirname, 'musavBenchmarkData.json');

  let dataPath = defaultPath;
  if (argPath && fs.existsSync(argPath)) {
    dataPath = argPath;
  } else if (!fs.existsSync(defaultPath)) {
    dataPath = fallbackPath;
  }

  console.log(`📂 Loading input track dataset from: ${path.basename(dataPath)}`);
  const rawData: InputTrack[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`📊 Total Songs in Pool: ${rawData.length}\n`);

  // 1. MENTAL DRIFT ENGINE
  const driftInputs: DriftTrack[] = rawData.map((t, idx) => ({
    videoId: t.videoId || t.id || `track_${idx + 1}`,
    title: t.title,
    artist: t.artist,
    estimatedBpm: t.estimatedBpm || t.bpm || 120,
    intensityScore: t.intensityScore ?? t.intensity ?? t.arousal ?? 0.5,
    originalIndex: idx
  }));

  const driftOutput = generateDriftPlaylist(driftInputs);
  const driftMetrics = computeMetrics(driftOutput.tracks, t => t.intensityScore, driftOutput.harshTracks.length);

  // 2. FRAME ENGINE
  const frameInputs: FrameTrack[] = rawData.map((t, idx) => ({
    id: t.id || t.videoId || `track_${idx + 1}`,
    title: t.title,
    artist: t.artist,
    bpm: t.bpm || t.estimatedBpm || 120,
    intensity: t.intensity ?? t.intensityScore ?? t.arousal ?? 0.5,
    arousal: t.arousal ?? t.intensity ?? t.intensityScore ?? 0.5,
    valence: t.valence ?? 0.5
  }));

  const frameOutput = processFrameEngine(frameInputs);
  const frameMetrics = computeMetrics(frameOutput.acceptedTracks, t => t.intensity ?? t.arousal ?? 0.5, frameOutput.rejectedTracks.length);

  // 3. UNHINGED ENGINE
  const unhingedInputs: UnhingedTrack[] = rawData.map((t, idx) => ({
    id: t.id || t.videoId || `track_${idx + 1}`,
    title: t.title,
    artist: t.artist,
    bpm: t.bpm || t.estimatedBpm || 120,
    arousal: t.arousal ?? t.intensity ?? t.intensityScore ?? 0.5,
    intensity: t.intensity ?? t.intensityScore ?? t.arousal ?? 0.5,
    valence: t.valence ?? 0.5,
    genre: t.genre || 'Indie / Pop',
    key: t.key || '8A',
    subBassDensity: t.subBassDensity ?? 0.5
  }));

  const unhingedOutput = processUnhingedAlgorithm(unhingedInputs);
  const unhingedMetrics = computeMetrics(unhingedOutput.sequencedTracks, t => t.arousal ?? t.intensity ?? 0.5, unhingedOutput.rejectedTracks.length);

  // 4. RISE ALGORITHM
  const riseInputs: RiseTrack[] = rawData.map((t, idx) => ({
    id: t.id || t.videoId || `track_${idx + 1}`,
    title: t.title,
    artist: t.artist,
    bpm: t.bpm || t.estimatedBpm || 120,
    intensity: t.intensity ?? t.intensityScore ?? t.arousal ?? 0.5,
    arousal: t.arousal ?? t.intensity ?? t.intensityScore ?? 0.5,
    valence: t.valence ?? 0.5,
    genre: t.genre || 'General',
    key: t.key || '8A',
    subBassDensity: t.subBassDensity ?? 0.5
  }));

  const riseOutput = processRiseAlgorithm(riseInputs);
  const riseMetrics = computeMetrics(riseOutput.sequencedTracks, t => t.effectiveEnergy, riseOutput.rejectedTracks.length);

  // PRINT ORIGINAL INPUT SEQUENCE
  console.log(renderTrajectoryMap('RAW UNORDERED PLAYLIST', rawData, t => t.intensity ?? t.intensityScore ?? t.arousal ?? 0.5));
  console.log('\n' + '='.repeat(88) + '\n');

  // PRINT DRIFT SEQUENCE MAP
  console.log(renderTrajectoryMap('🌊 MENTAL DRIFT MODE (Focus / Steady Flow)', driftOutput.tracks, t => t.intensityScore));
  if (driftOutput.harshTracks.length > 0) {
    console.log(`   🚫 Filtered Out (Harsh/BPM Gate): ${driftOutput.harshTracks.map(t => t.title).join(', ')}`);
  }
  console.log('\n' + '='.repeat(88) + '\n');

  // PRINT FRAME ENGINE SEQUENCE MAP
  console.log(renderTrajectoryMap('🎬 FRAME ENGINE MODE (3-Act Narrative Arc)', frameOutput.acceptedTracks, t => t.intensity ?? t.arousal ?? 0.5));
  if (frameOutput.rejectedTracks.length > 0) {
    console.log(`   🚫 Filtered Out: ${frameOutput.rejectedTracks.map(t => t.track.title).join(', ')}`);
  }
  console.log(`   📐 Act Trajectory: ${frameOutput.metrics.actDirection} | Mean ΔE: ${frameOutput.metrics.meanDeltaEnergy.toFixed(4)}`);
  console.log('\n' + '='.repeat(88) + '\n');

  // PRINT UNHINGED ENGINE SEQUENCE MAP
  console.log(renderTrajectoryMap('⚡ UNHINGED ENGINE MODE (Subversive Curveballs & Anchors)', unhingedOutput.sequencedTracks, t => t.arousal ?? t.intensity ?? 0.5));
  if (unhingedOutput.rejectedTracks.length > 0) {
    console.log(`   🚫 Filtered Out: ${unhingedOutput.rejectedTracks.map(t => t.track.title || 'Unknown').join(', ')}`);
  }
  if (unhingedOutput.anchorLogs.length > 0) {
    console.log('\n  ⚓ Curveball Anchor Events:');
    unhingedOutput.anchorLogs.forEach(log => console.log(`     ${log}`));
  }
  console.log('\n' + '='.repeat(88) + '\n');

  // PRINT RISE ALGORITHM SEQUENCE MAP
  console.log(renderTrajectoryMap('📈 RISE ALGORITHM MODE (Staircase Flow Model & Organic Ascent)', riseOutput.sequencedTracks, t => t.effectiveEnergy));
  console.log(`   📈 Energy Slope (m): ${riseOutput.metrics.slope} | Smoothness: ${riseOutput.metrics.smoothnessScore} / 100`);
  console.log('\n' + '='.repeat(88) + '\n');

  // COMPARATIVE METRICS SUMMARY TABLE
  console.log('🏆 ALGORITHM COMPARATIVE PERFORMANCE SUMMARY:');
  console.table([
    {
      Engine: '🌊 Mental Drift',
      'Accepted / Total': `${driftMetrics.acceptedTracks} / ${rawData.length}`,
      'Track Yield': `${((driftMetrics.acceptedTracks / rawData.length) * 100).toFixed(1)}%`,
      'Mean ΔEnergy': driftMetrics.meanDelta,
      'Max ΔEnergy': driftMetrics.maxDelta,
      'Jarring Jumps (>0.35)': driftMetrics.jarringCount,
      'Smoothness Score': `${driftMetrics.smoothnessScore} / 100`
    },
    {
      Engine: '🎬 Frame Engine',
      'Accepted / Total': `${frameMetrics.acceptedTracks} / ${rawData.length}`,
      'Track Yield': `${((frameMetrics.acceptedTracks / rawData.length) * 100).toFixed(1)}%`,
      'Mean ΔEnergy': frameMetrics.meanDelta,
      'Max ΔEnergy': frameMetrics.maxDelta,
      'Jarring Jumps (>0.35)': frameMetrics.jarringCount,
      'Smoothness Score': `${frameMetrics.smoothnessScore} / 100`
    },
    {
      Engine: '⚡ Unhinged Engine',
      'Accepted / Total': `${unhingedMetrics.acceptedTracks} / ${rawData.length}`,
      'Track Yield': `${((unhingedMetrics.acceptedTracks / rawData.length) * 100).toFixed(1)}%`,
      'Mean ΔEnergy': unhingedMetrics.meanDelta,
      'Max ΔEnergy': unhingedMetrics.maxDelta,
      'Jarring Jumps (>0.35)': unhingedMetrics.jarringCount,
      'Smoothness Score': `${unhingedMetrics.smoothnessScore} / 100`
    },
    {
      Engine: '📈 Rise Algorithm',
      'Accepted / Total': `${riseMetrics.acceptedTracks} / ${rawData.length}`,
      'Track Yield': `${((riseMetrics.acceptedTracks / rawData.length) * 100).toFixed(1)}%`,
      'Mean ΔEnergy': riseMetrics.meanDelta,
      'Max ΔEnergy': riseMetrics.maxDelta,
      'Jarring Jumps (>0.35)': riseMetrics.jarringCount,
      'Smoothness Score': `${riseMetrics.smoothnessScore} / 100`
    }
  ]);

  console.log('\n========================================================================================\n');
}

runCombinedEvaluation();
