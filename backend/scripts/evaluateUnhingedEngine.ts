import fs from 'fs';
import path from 'path';
import { processUnhingedAlgorithm, SequencedTrack, UnhingedOutput } from '../src/utils/unhingedAlgorithm';

function renderAsciiTrajectoryMap(sequenced: SequencedTrack[]): string {
  if (sequenced.length === 0) return 'Empty sequence';

  return sequenced
    .map((track, idx) => {
      const trackNumStr = (idx + 1).toString().padStart(2, '0');
      let roleTag = '';
      if (track.role === 'SETUP') roleTag = '[SETUP]   ';
      else if (track.role === 'CURVEBALL') roleTag = '⚡[CURVEBALL!]';
      else if (track.role === 'RECOVERY') roleTag = '[RECOVER] ';

      const energy = track.arousal ?? track.intensity ?? 0;
      const barLength = Math.round(energy * 20);
      const bar = '█'.repeat(barLength).padEnd(20, '░');
      const titleStr = `${track.artist} - ${track.title}`.padEnd(40, ' ');
      const genreKeyStr = `${track.genre} (${track.key})`.padEnd(28, ' ');
      const energyStr = energy.toFixed(2);
      const anchorStr = track.anchorReason ? ` -> Anchor: ${track.anchorReason}` : '';
      const shockStr = track.shockDelta !== undefined ? ` (ΔE = ${track.shockDelta.toFixed(2)})` : '';

      return ` ${roleTag} [Track #${trackNumStr}] | ${bar} | E: ${energyStr} | ${titleStr} | ${genreKeyStr}${shockStr}${anchorStr}`;
    })
    .join('\n');
}

function runUnhingedEvaluation() {
  console.log('\n========================================================================================');
  console.log('       ⚡ TUNEIT UNHINGED ENGINE (REBALANCED ANCHOR MECHANICS BENCHMARK) ⚡        ');
  console.log('========================================================================================\n');

  const mtgPath = path.join(__dirname, '..', 'tests', 'fixtures', 'mtg_jamendo_dataset.json');
  const musavPath = path.join(__dirname, '..', 'tests', 'fixtures', 'musav_30.json');

  if (!fs.existsSync(mtgPath) || !fs.existsSync(musavPath)) {
    console.error('❌ Benchmark dataset fixtures not found in /tests/fixtures/');
    process.exit(1);
  }

  const jamendoTracks = JSON.parse(fs.readFileSync(mtgPath, 'utf-8'));
  const musavTracks = JSON.parse(fs.readFileSync(musavPath, 'utf-8'));
  const combinedPool = [...jamendoTracks, ...musavTracks];

  console.log(`📥 Loaded ${jamendoTracks.length} MTG-Jamendo + ${musavTracks.length} MusAV tracks (Total Pool: ${combinedPool.length} tracks).\n`);

  // Run Unhinged Engine
  const unhingedOutput: UnhingedOutput = processUnhingedAlgorithm(combinedPool);
  const { sequencedTracks, metrics, anchorLogs, rejectedTracks } = unhingedOutput;

  // 1. Output Domain Specific Metrics Table
  console.log('--- 📊 UNHINGED ENGINE REBALANCED METRICS SUMMARY ---');
  console.table([
    {
      Metric: 'Accepted / Total Tracks',
      Value: `${sequencedTracks.length} / ${combinedPool.length}`
    },
    {
      Metric: 'Rejected (Dead Weight / Outliers)',
      Value: `${rejectedTracks.length} tracks`
    },
    {
      Metric: 'Yield Retention Rate (Target 85%-90%)',
      Value: unhingedOutput.yieldRetention
    },
    {
      Metric: 'Total Curveballs Injected',
      Value: metrics.totalCurveballs
    },
    {
      Metric: 'Curveball Frequency',
      Value: metrics.curveballFrequency
    },
    {
      Metric: 'Mean Shock Δ Energy (Curveballs)',
      Value: metrics.meanShockDelta.toFixed(4)
    },
    {
      Metric: 'Max Shock Δ Energy',
      Value: metrics.maxShockDelta.toFixed(4)
    },
    {
      Metric: 'Harmonic Anchor Success Rate',
      Value: metrics.harmonicAnchorRate
    },
    {
      Metric: 'Frequency/Rhythm Anchor Success Rate',
      Value: metrics.frequencyAnchorRate
    },
    {
      Metric: 'Setup Trajectory Smoothness Score',
      Value: `${unhingedOutput.smoothnessScore} / 100`
    }
  ]);

  // 2. Dead Weight Filter Rejection Log
  if (rejectedTracks.length > 0) {
    console.log('\n--- 🚫 REJECTED TRACKS LOG (DEAD WEIGHT FILTER) ---');
    rejectedTracks.forEach(item => {
      console.log(`  ❌ Rejected: "${item.track.artist ?? 'Unknown'} - ${item.track.title ?? 'Unknown'}" -> Reason: ${item.reason}`);
    });
  }

  // 3. Verified Curveball Anchor Logs
  console.log('\n--- ⚓ VERIFIED CURVEBALL ANCHOR LOGS ---');
  if (anchorLogs.length === 0) {
    console.log(' (No curveballs logged)');
  } else {
    anchorLogs.forEach(log => console.log(`  ${log}`));
  }

  // 4. Render ASCII Trajectory Map
  console.log('\n--- 🗺️ UNHINGED SEQUENCED OUTPUT TRAJECTORY MAP ---');
  console.log(renderAsciiTrajectoryMap(sequencedTracks));

  // 5. System Specification Verification Suite
  console.log('\n--- 🧪 UNHINGED ENGINE VALIDATION VERIFICATION SUITE ---');

  const retentionVal = (sequencedTracks.length / combinedPool.length) * 100;
  const check1YieldMet = retentionVal >= 80.0 && retentionVal <= 92.0;

  const curveballTracks = sequencedTracks.filter(t => t.role === 'CURVEBALL');
  const unanchoredCurveballs = curveballTracks.filter(t => !t.anchorReason || t.anchorType === 'NONE');
  const check2AnchoredMet = curveballTracks.length > 0 && unanchoredCurveballs.length === 0;

  const harmonicRateNum = parseFloat(metrics.harmonicAnchorRate);
  const freqRateNum = parseFloat(metrics.frequencyAnchorRate);
  const check3BalancedAnchorsMet = harmonicRateNum >= 60.0 && freqRateNum >= 60.0;

  console.log(
    ` ${check1YieldMet ? '✅' : '❌'} Check 1: Yield Retention Target (80.0% - 92.0%, Ideal 85%-90%) -> Actual Yield = ${retentionVal.toFixed(1)}% (${sequencedTracks.length}/${combinedPool.length})`
  );
  console.log(
    ` ${check2AnchoredMet ? '✅' : '❌'} Check 2: 100% Curveball Transition Anchors Verified -> ${curveballTracks.length - unanchoredCurveballs.length}/${curveballTracks.length} Curveballs Strictly Anchored`
  );
  console.log(
    ` ${check3BalancedAnchorsMet ? '✅' : '❌'} Check 3: Dual High-Coverage Anchor Rebalance (Harmonic & Freq/Rhythm >= 60%) -> Harmonic = ${metrics.harmonicAnchorRate}, Freq/Rhythm = ${metrics.frequencyAnchorRate}`
  );

  console.log('\n========================================================================================');
  if (check1YieldMet && check2AnchoredMet && check3BalancedAnchorsMet) {
    console.log('✨ ALL UNHINGED ENGINE REBALANCED SPECIFICATION ASSERTIONS PASSED PERFECTLY!');
  } else {
    console.error('❌ VALIDATION FAILURE DETECTED IN UNHINGED ENGINE REBALANCED SPECIFICATION');
    process.exit(1);
  }
  console.log('========================================================================================\n');
}

runUnhingedEvaluation();
