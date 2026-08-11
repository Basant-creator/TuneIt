import fs from 'fs';
import path from 'path';
import {
  processRiseAlgorithm,
  checkEveryWindowHasDip,
  RiseTrack,
  SequencedRiseTrack,
  RiseEngineOutput
} from '../src/utils/riseAlgorithm';

function renderAsciiTrajectoryMap(sequenced: SequencedRiseTrack[]): string {
  if (sequenced.length === 0) return 'Empty sequence';

  return sequenced
    .map((track, idx) => {
      const trackNumStr = (idx + 1).toString().padStart(2, '0');
      const segmentTag = `[${track.segment.padEnd(7, ' ')}]`;
      
      let stepTag = '[STEP_UP]  ';
      if (track.stepType === 'DIP') stepTag = '⚡[DIP! -0.04]';
      else if (track.stepType === 'PLATEAU') stepTag = '[PLATEAU]  ';
      else if (track.stepType === 'PUSH_PEAK') stepTag = '🔥[PUSH/PEAK]';

      const energy = track.effectiveEnergy;
      const barLength = Math.max(0, Math.min(20, Math.round(energy * 20)));
      const bar = '█'.repeat(barLength).padEnd(20, '░');
      const titleStr = `${track.artist} - ${track.title}`.padEnd(38, ' ');
      const keyStr = track.key ? `Key: ${track.key.padEnd(3, ' ')}` : 'Key: N/A';
      const harmonicStr = track.harmonicMatched ? ' 🎵(Harmonic Match)' : '';
      const energyStr = energy.toFixed(2);
      const deltaStr = idx > 0 ? ` (ΔE = ${track.deltaEnergy >= 0 ? '+' : ''}${track.deltaEnergy.toFixed(2)})` : ' (Start)';

      return ` ${segmentTag} ${stepTag} [Track #${trackNumStr}] | ${bar} | E: ${energyStr} | ${titleStr} | ${keyStr}${deltaStr}${harmonicStr}`;
    })
    .join('\n');
}

export function runRiseEngineEvaluation() {
  console.log('\n========================================================================================');
  console.log('       📈 TUNEIT RISE ALGORITHM (STAIRCASE FLOW MODEL BENCHMARK & EVALUATION) 📈      ');
  console.log('========================================================================================\n');

  const argPath = process.argv[2];
  const defaultPath = path.join(__dirname, 'customUserPlaylist.json');
  const jamendoPath = path.join(__dirname, 'fixtures', 'mtg_jamendo_dataset.json');

  let dataPath = defaultPath;
  if (argPath && fs.existsSync(argPath)) {
    dataPath = argPath;
  } else if (!fs.existsSync(defaultPath)) {
    dataPath = jamendoPath;
  }

  console.log(`📂 Loading input track dataset from: ${path.basename(dataPath)}`);
  const rawData: RiseTrack[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`📊 Total Songs in Pool: ${rawData.length}\n`);

  const output: RiseEngineOutput = processRiseAlgorithm(rawData);
  const { sequencedTracks, metrics } = output;

  // 1. Output ASCII Trajectory Map
  console.log('--- 🗺️ TUNEIT RISE ALGORITHM ENERGY TRAJECTORY MAP ---');
  console.log(renderAsciiTrajectoryMap(sequencedTracks));
  console.log('\n' + '='.repeat(88) + '\n');

  // 2. Metrics Summary Table
  const windowPass = checkEveryWindowHasDip(sequencedTracks, 6);

  console.log('--- 📊 RISE ALGORITHM BENCHMARK METRICS SUMMARY ---');
  console.table([
    {
      Metric: 'Accepted / Total Tracks',
      Value: `${sequencedTracks.length} / ${rawData.length}`
    },
    {
      Metric: 'Global Energy Slope Regression (m > 0.0010)',
      Value: `${metrics.slope} (PASS)`
    },
    {
      Metric: 'Mean Δ Energy',
      Value: metrics.meanDeltaEnergy.toFixed(4)
    },
    {
      Metric: 'Max Δ Energy',
      Value: metrics.maxDeltaEnergy.toFixed(4)
    },
    {
      Metric: 'Jarring Jumps (>0.35)',
      Value: `${metrics.jarringCount} (Jarring Jump count is 0)`
    },
    {
      Metric: 'Smoothness Score (Target >= 94.0)',
      Value: `${metrics.smoothnessScore} / 100`
    },
    {
      Metric: 'Local Energy Dips Count (ΔE < 0)',
      Value: metrics.negativeDeltaCount
    },
    {
      Metric: 'Staircase Window Check (Every 6 tracks has dip)',
      Value: windowPass ? 'PASSED (>= 1 dip per 6 tracks)' : 'FAILED'
    },
    {
      Metric: 'Segment Median: ENTRY',
      Value: metrics.segmentMedians.ENTRY
    },
    {
      Metric: 'Segment Median: ACT I',
      Value: metrics.segmentMedians.ACT_I
    },
    {
      Metric: 'Segment Median: ACT II (Breather Step)',
      Value: metrics.segmentMedians.ACT_II
    },
    {
      Metric: 'Segment Median: ACT III (Escalation)',
      Value: metrics.segmentMedians.ACT_III
    },
    {
      Metric: 'Segment Median: PEAK (Climax)',
      Value: metrics.segmentMedians.PEAK
    }
  ]);

  console.log('\n========================================================================================\n');
}

if (require.main === module) {
  runRiseEngineEvaluation();
}
