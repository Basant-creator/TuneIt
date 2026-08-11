"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const driftAlgorithm_1 = require("../src/utils/driftAlgorithm");
function computeMetrics(engineName, tracks, rejectedCount) {
    if (tracks.length < 2) {
        return {
            engineName,
            totalTracks: tracks.length + rejectedCount,
            acceptedTracks: tracks.length,
            rejectedTracks: rejectedCount,
            meanArousalDelta: 0,
            maxArousalDelta: 0,
            jarringTransitionsCount: 0,
            smoothnessScore: 100
        };
    }
    let totalDelta = 0;
    let maxDelta = 0;
    let jarringCount = 0;
    for (let i = 0; i < tracks.length - 1; i++) {
        const current = tracks[i];
        const next = tracks[i + 1];
        const delta = Math.abs(next.arousal - current.arousal);
        totalDelta += delta;
        if (delta > maxDelta)
            maxDelta = delta;
        if (delta > 0.35)
            jarringCount++;
    }
    const meanDelta = totalDelta / (tracks.length - 1);
    const smoothnessScore = Math.max(0, Number((100 - meanDelta * 100).toFixed(2)));
    return {
        engineName,
        totalTracks: tracks.length + rejectedCount,
        acceptedTracks: tracks.length,
        rejectedTracks: rejectedCount,
        meanArousalDelta: Number(meanDelta.toFixed(4)),
        maxArousalDelta: Number(maxDelta.toFixed(4)),
        jarringTransitionsCount: jarringCount,
        smoothnessScore
    };
}
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function renderTrajectoryMap(tracks) {
    if (tracks.length === 0)
        return 'Empty sequence';
    return tracks.map((t, idx) => {
        const barLength = Math.round(t.arousal * 20);
        const bar = '█'.repeat(barLength).padEnd(20, '░');
        return ` [${(idx + 1).toString().padStart(2, '0')}] ${bar} | Arousal: ${t.arousal.toFixed(2)} | ${t.artist} - ${t.title}`;
    }).join('\n');
}
function runBenchmark() {
    console.log('\n========================================================================');
    console.log('       🎵 TUNEIT SEQUENCING ENGINE BENCHMARK (MusAV DATASET) 🎵        ');
    console.log('========================================================================\n');
    const dataPath = path_1.default.join(__dirname, 'musavBenchmarkData.json');
    if (!fs_1.default.existsSync(dataPath)) {
        console.error(`Error: MusAV benchmark dataset file not found at ${dataPath}`);
        process.exit(1);
    }
    const rawData = JSON.parse(fs_1.default.readFileSync(dataPath, 'utf-8'));
    console.log(`Loaded ${rawData.length} tracks from MusAV dataset benchmark.\n`);
    // Map to DriftTrack interface for algorithm input
    const driftTracks = rawData.map((track, idx) => ({
        videoId: track.videoId,
        title: track.title,
        artist: track.artist,
        estimatedBpm: track.estimatedBpm,
        intensityScore: track.intensityScore,
        originalIndex: idx
    }));
    // Create a map by videoId for easy lookup of MusAV ground-truth annotations
    const trackMap = new Map();
    rawData.forEach(t => trackMap.set(t.videoId, t));
    // 1. Original Unsorted Benchmark
    const originalMetrics = computeMetrics('Original Order (Unsorted)', rawData, 0);
    // 2. Random Shuffle Benchmark (averaged over 10 runs)
    let randomDeltas = 0;
    let randomMaxDelta = 0;
    let randomJarring = 0;
    const RUNS = 10;
    for (let r = 0; r < RUNS; r++) {
        const shuffled = shuffleArray(rawData);
        const m = computeMetrics('Random', shuffled, 0);
        randomDeltas += m.meanArousalDelta;
        randomMaxDelta = Math.max(randomMaxDelta, m.maxArousalDelta);
        randomJarring += m.jarringTransitionsCount;
    }
    const avgRandomMetrics = {
        engineName: 'Random Shuffle (10x Avg)',
        totalTracks: rawData.length,
        acceptedTracks: rawData.length,
        rejectedTracks: 0,
        meanArousalDelta: Number((randomDeltas / RUNS).toFixed(4)),
        maxArousalDelta: Number(randomMaxDelta.toFixed(4)),
        jarringTransitionsCount: Math.round(randomJarring / RUNS),
        smoothnessScore: Number((100 - (randomDeltas / RUNS) * 100).toFixed(2))
    };
    // 3. TuneIt Mental Drift Engine Benchmark
    const driftResult = (0, driftAlgorithm_1.generateDriftPlaylist)(driftTracks);
    const driftSequencedMusavTracks = driftResult.tracks
        .map(dt => trackMap.get(dt.videoId))
        .filter((t) => t !== undefined);
    const tuneItMetrics = computeMetrics('TuneIt Mental Drift Engine', driftSequencedMusavTracks, driftResult.harshTracks.length);
    // Print Summary Table
    console.log('--- BENCHMARK METRICS SUMMARY ---');
    console.table([
        {
            Engine: originalMetrics.engineName,
            'Accepted / Total': `${originalMetrics.acceptedTracks}/${originalMetrics.totalTracks}`,
            'Mean Δ Arousal': originalMetrics.meanArousalDelta,
            'Max Δ Arousal': originalMetrics.maxArousalDelta,
            'Jarring Jumps (>0.35)': originalMetrics.jarringTransitionsCount,
            'Smoothness Score': `${originalMetrics.smoothnessScore} / 100`
        },
        {
            Engine: avgRandomMetrics.engineName,
            'Accepted / Total': `${avgRandomMetrics.acceptedTracks}/${avgRandomMetrics.totalTracks}`,
            'Mean Δ Arousal': avgRandomMetrics.meanArousalDelta,
            'Max Δ Arousal': avgRandomMetrics.maxArousalDelta,
            'Jarring Jumps (>0.35)': avgRandomMetrics.jarringTransitionsCount,
            'Smoothness Score': `${avgRandomMetrics.smoothnessScore} / 100`
        },
        {
            Engine: tuneItMetrics.engineName,
            'Accepted / Total': `${tuneItMetrics.acceptedTracks}/${tuneItMetrics.totalTracks}`,
            'Mean Δ Arousal': tuneItMetrics.meanArousalDelta,
            'Max Δ Arousal': tuneItMetrics.maxArousalDelta,
            'Jarring Jumps (>0.35)': tuneItMetrics.jarringTransitionsCount,
            'Smoothness Score': `${tuneItMetrics.smoothnessScore} / 100`
        }
    ]);
    // Vibe Gate Isolation Summary
    console.log('\n--- HARD VIBE GATE PERFORMANCE ---');
    console.log(`Tracks isolated/rejected by Hard Vibe Gate: ${driftResult.harshTracks.length}`);
    driftResult.harshTracks.forEach(t => {
        const orig = trackMap.get(t.videoId);
        console.log(`  ❌ Rejected: "${t.artist} - ${t.title}" | BPM: ${t.estimatedBpm} | Intensity: ${t.intensityScore} | MusAV Arousal: ${orig?.arousal}`);
    });
    // ASCII Energy Trajectory Comparison
    console.log('\n--- TUNEIT SEQUENCED OUTPUT ENERGY TRAJECTORY MAP ---');
    console.log(renderTrajectoryMap(driftSequencedMusavTracks));
    // Improvement Calculation
    const deltaImprovement = (((avgRandomMetrics.meanArousalDelta - tuneItMetrics.meanArousalDelta) / avgRandomMetrics.meanArousalDelta) * 100).toFixed(1);
    const smoothnessGain = (tuneItMetrics.smoothnessScore - avgRandomMetrics.smoothnessScore).toFixed(1);
    console.log('\n========================================================================');
    console.log(`✨ VERDICT: TuneIt Mental Drift Engine reduced transition friction by ${deltaImprovement}%`);
    console.log(`✨ Smoothness Score improved by +${smoothnessGain} points over random ordering!`);
    console.log('========================================================================\n');
}
runBenchmark();
