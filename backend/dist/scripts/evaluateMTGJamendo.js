"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const perf_hooks_1 = require("perf_hooks");
const frameAlgorithm_1 = require("../src/utils/frameAlgorithm");
const driftAlgorithm_1 = require("../src/utils/driftAlgorithm");
const unhingedAlgorithm_1 = require("../src/utils/unhingedAlgorithm");
const riseAlgorithm_1 = require("../src/utils/riseAlgorithm");
function generateScaledPool(baseTracks, targetSize) {
    const result = [];
    let idCounter = 1;
    while (result.length < targetSize) {
        for (const item of baseTracks) {
            if (result.length >= targetSize)
                break;
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
function evaluateFrameOnPool(pool, engineLabel) {
    const start = perf_hooks_1.performance.now();
    const output = (0, frameAlgorithm_1.processFrameAlgorithm)(pool);
    const end = perf_hooks_1.performance.now();
    const executionTimeMs = Number((end - start).toFixed(2));
    const throughputPerSec = Math.round((pool.length / (executionTimeMs || 1)) * 1000);
    const accepted = output.acceptedTracks;
    const rejectedCount = output.rejectedTracks.length;
    const retentionPct = ((accepted.length / pool.length) * 100).toFixed(1) + '%';
    let totalDelta = 0;
    let maxDelta = 0;
    let jarringJumps = 0;
    for (let i = 0; i < accepted.length - 1; i++) {
        const d = Math.abs((0, frameAlgorithm_1.getTrackEnergy)(accepted[i + 1]) - (0, frameAlgorithm_1.getTrackEnergy)(accepted[i]));
        totalDelta += d;
        if (d > maxDelta)
            maxDelta = d;
        if (d > 0.35)
            jarringJumps++;
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
function evaluateDriftOnPool(pool, engineLabel) {
    const driftInput = pool.map((t, idx) => ({
        videoId: t.id,
        title: t.title,
        artist: t.artist,
        estimatedBpm: t.bpm,
        intensityScore: t.intensity,
        originalIndex: idx
    }));
    const start = perf_hooks_1.performance.now();
    const result = (0, driftAlgorithm_1.generateDriftPlaylist)(driftInput);
    const end = perf_hooks_1.performance.now();
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
        if (d > maxDelta)
            maxDelta = d;
        if (d > 0.35)
            jarringJumps++;
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
function evaluateUnhingedOnPool(pool, engineLabel) {
    const start = perf_hooks_1.performance.now();
    const output = (0, unhingedAlgorithm_1.processUnhingedAlgorithm)(pool);
    const end = perf_hooks_1.performance.now();
    const executionTimeMs = Number((end - start).toFixed(2));
    const throughputPerSec = Math.round((pool.length / (executionTimeMs || 1)) * 1000);
    const accepted = output.sequencedTracks;
    const rejectedCount = output.rejectedTracks.length;
    const retentionPct = ((accepted.length / pool.length) * 100).toFixed(1) + '%';
    let totalDelta = 0;
    let maxDelta = 0;
    let jarringJumps = 0;
    for (let i = 0; i < accepted.length - 1; i++) {
        const e1 = accepted[i].arousal ?? accepted[i].intensity ?? 0;
        const e2 = accepted[i + 1].arousal ?? accepted[i + 1].intensity ?? 0;
        const d = Math.abs(e2 - e1);
        totalDelta += d;
        if (d > maxDelta)
            maxDelta = d;
        if (d > 0.35)
            jarringJumps++;
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
function evaluateRiseOnPool(pool, engineLabel) {
    const riseInputs = pool.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        bpm: t.bpm,
        intensity: t.intensity
    }));
    const start = perf_hooks_1.performance.now();
    const output = (0, riseAlgorithm_1.processRiseAlgorithm)(riseInputs);
    const end = perf_hooks_1.performance.now();
    const executionTimeMs = Number((end - start).toFixed(2));
    const throughputPerSec = Math.round((pool.length / (executionTimeMs || 1)) * 1000);
    const accepted = output.sequencedTracks;
    const rejectedCount = output.rejectedTracks.length;
    const retentionPct = ((accepted.length / pool.length) * 100).toFixed(1) + '%';
    let totalDelta = 0;
    let maxDelta = 0;
    let jarringJumps = 0;
    for (let i = 0; i < accepted.length - 1; i++) {
        const d = Math.abs(accepted[i + 1].effectiveEnergy - accepted[i].effectiveEnergy);
        totalDelta += d;
        if (d > maxDelta)
            maxDelta = d;
        if (d > 0.35)
            jarringJumps++;
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
    const fixturePath = path_1.default.join(__dirname, 'fixtures', 'mtg_jamendo_dataset.json');
    if (!fs_1.default.existsSync(fixturePath)) {
        console.error(`❌ Error: MTG-Jamendo dataset fixture not found at ${fixturePath}`);
        process.exit(1);
    }
    const baseTracks = JSON.parse(fs_1.default.readFileSync(fixturePath, 'utf-8'));
    console.log(`📥 Loaded base MTG-Jamendo dataset fixture (${baseTracks.length} tracks).\n`);
    const SCALES = [50, 200, 500, 1000];
    // 1. FRAME ENGINE SCALE EVALUATION
    console.log('--- 🎬 1. TUNEIT FRAME ENGINE SCALE EVALUATION (MTG-JAMENDO) ---');
    const frameScaleResults = [];
    for (const scale of SCALES) {
        const pool = generateScaledPool(baseTracks, scale);
        const res = evaluateFrameOnPool(pool, `Frame Engine (N=${scale})`);
        frameScaleResults.push(res);
    }
    console.table(frameScaleResults.map(r => ({
        'Track Pool Size (N)': r.poolSize,
        'Accepted / Total': `${r.acceptedTracks} / ${r.poolSize}`,
        'Yield Retention': r.retentionPct,
        'Execution Time': `${r.executionTimeMs} ms`,
        'Throughput': `${r.throughputPerSec.toLocaleString()} tracks/sec`,
        'Mean Δ Energy': r.meanDelta,
        'Max Δ Energy': r.maxDelta,
        'Jarring Jumps (>0.35)': r.jarringJumps,
        'Smoothness Score': `${r.smoothnessScore} / 100`
    })));
    // 2. MENTAL DRIFT ENGINE SCALE EVALUATION
    console.log('\n--- 🌊 2. TUNEIT MENTAL DRIFT ENGINE SCALE EVALUATION (MTG-JAMENDO) ---');
    const driftScaleResults = [];
    for (const scale of SCALES) {
        const pool = generateScaledPool(baseTracks, scale);
        const res = evaluateDriftOnPool(pool, `Drift Engine (N=${scale})`);
        driftScaleResults.push(res);
    }
    console.table(driftScaleResults.map(r => ({
        'Track Pool Size (N)': r.poolSize,
        'Accepted / Total': `${r.acceptedTracks} / ${r.poolSize}`,
        'Yield Retention': r.retentionPct,
        'Execution Time': `${r.executionTimeMs} ms`,
        'Throughput': `${r.throughputPerSec.toLocaleString()} tracks/sec`,
        'Mean Δ Energy': r.meanDelta,
        'Max Δ Energy': r.maxDelta,
        'Jarring Jumps (>0.35)': r.jarringJumps,
        'Smoothness Score': `${r.smoothnessScore} / 100`
    })));
    // 3. UNHINGED ENGINE SCALE EVALUATION
    console.log('\n--- ⚡ 3. TUNEIT UNHINGED ENGINE SCALE EVALUATION (MTG-JAMENDO) ---');
    const unhingedScaleResults = [];
    for (const scale of SCALES) {
        const pool = generateScaledPool(baseTracks, scale);
        const res = evaluateUnhingedOnPool(pool, `Unhinged Engine (N=${scale})`);
        unhingedScaleResults.push(res);
    }
    console.table(unhingedScaleResults.map(r => ({
        'Track Pool Size (N)': r.poolSize,
        'Accepted / Total': `${r.acceptedTracks} / ${r.poolSize}`,
        'Yield Retention': r.retentionPct,
        'Execution Time': `${r.executionTimeMs} ms`,
        'Throughput': `${r.throughputPerSec.toLocaleString()} tracks/sec`,
        'Mean Δ Energy': r.meanDelta,
        'Max Δ Energy': r.maxDelta,
        'Jarring Jumps (>0.35)': r.jarringJumps,
        'Smoothness Score': `${r.smoothnessScore} / 100`
    })));
    // 4. RISE ALGORITHM SCALE EVALUATION
    console.log('\n--- 📈 4. TUNEIT RISE ALGORITHM SCALE EVALUATION (MTG-JAMENDO) ---');
    const riseScaleResults = [];
    for (const scale of SCALES) {
        const pool = generateScaledPool(baseTracks, scale);
        const res = evaluateRiseOnPool(pool, `Rise Algorithm (N=${scale})`);
        riseScaleResults.push(res);
    }
    console.table(riseScaleResults.map(r => ({
        'Track Pool Size (N)': r.poolSize,
        'Accepted / Total': `${r.acceptedTracks} / ${r.poolSize}`,
        'Yield Retention': r.retentionPct,
        'Execution Time': `${r.executionTimeMs} ms`,
        'Throughput': `${r.throughputPerSec.toLocaleString()} tracks/sec`,
        'Mean Δ Energy': r.meanDelta,
        'Max Δ Energy': r.maxDelta,
        'Jarring Jumps (>0.35)': r.jarringJumps,
        'Smoothness Score': `${r.smoothnessScore} / 100`
    })));
    // 5. SIDE-BY-SIDE ALL FOUR ALGORITHMS COMPARISON AT N=500
    console.log('\n--- 📊 5. SIDE-BY-SIDE ALL 4 ALGORITHMS COMPARISON AT N=500 SCALED PLAYLIST ---');
    const pool500 = generateScaledPool(baseTracks, 500);
    const frame500 = evaluateFrameOnPool(pool500, 'TuneIt Frame Engine');
    const drift500 = evaluateDriftOnPool(pool500, 'TuneIt Mental Drift Engine');
    const unhinged500 = evaluateUnhingedOnPool(pool500, 'TuneIt Unhinged Engine');
    const rise500 = evaluateRiseOnPool(pool500, 'TuneIt Rise Algorithm');
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
        },
        {
            Engine: unhinged500.engineName,
            'Accepted / Total': `${unhinged500.acceptedTracks} / 500`,
            'Yield Retention': unhinged500.retentionPct,
            'Execution Time': `${unhinged500.executionTimeMs} ms`,
            'Throughput': `${unhinged500.throughputPerSec.toLocaleString()} tracks/sec`,
            'Mean Δ Energy': unhinged500.meanDelta,
            'Max Δ Energy': unhinged500.maxDelta,
            'Jarring Jumps (>0.35)': unhinged500.jarringJumps,
            'Smoothness Score': `${unhinged500.smoothnessScore} / 100`
        },
        {
            Engine: rise500.engineName,
            'Accepted / Total': `${rise500.acceptedTracks} / 500`,
            'Yield Retention': rise500.retentionPct,
            'Execution Time': `${rise500.executionTimeMs} ms`,
            'Throughput': `${rise500.throughputPerSec.toLocaleString()} tracks/sec`,
            'Mean Δ Energy': rise500.meanDelta,
            'Max Δ Energy': rise500.maxDelta,
            'Jarring Jumps (>0.35)': rise500.jarringJumps,
            'Smoothness Score': `${rise500.smoothnessScore} / 100`
        }
    ]);
    console.log('\n====================================================================================');
    console.log(`🎬 FRAME ENGINE (N=1,000): Processed 1,000 tracks in ${frameScaleResults[3].executionTimeMs} ms (${frameScaleResults[3].throughputPerSec.toLocaleString()} tracks/sec)`);
    console.log(`🌊 DRIFT ENGINE (N=1,000): Processed 1,000 tracks in ${driftScaleResults[3].executionTimeMs} ms (${driftScaleResults[3].throughputPerSec.toLocaleString()} tracks/sec)`);
    console.log(`⚡ UNHINGED ENGINE (N=1,000): Processed 1,000 tracks in ${unhingedScaleResults[3].executionTimeMs} ms (${unhingedScaleResults[3].throughputPerSec.toLocaleString()} tracks/sec)`);
    console.log(`📈 RISE ALGORITHM (N=1,000): Processed 1,000 tracks in ${riseScaleResults[3].executionTimeMs} ms (${riseScaleResults[3].throughputPerSec.toLocaleString()} tracks/sec)`);
    console.log('====================================================================================\n');
}
runMTGJamendoEvaluation();
