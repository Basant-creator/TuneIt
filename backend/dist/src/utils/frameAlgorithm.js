"use strict";
/**
 * Frame Algorithm (Dynamic Cinematic Sequencing Engine)
 *
 * Sequences any input music track pool (whether high-energy, balanced, or low-energy/chill)
 * into a dynamic 3-Act narrative trajectory (Exposition -> Dynamic Arc -> Monotonic Resolution).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFrameEngine = void 0;
exports.getTrackEnergy = getTrackEnergy;
exports.computeMean = computeMean;
exports.computeVariance = computeVariance;
exports.computeSkewness = computeSkewness;
exports.computeSmoothnessScore = computeSmoothnessScore;
exports.processFrameAlgorithm = processFrameAlgorithm;
/**
 * Gets the primary energy metric (intensity) of a track.
 */
function getTrackEnergy(t) {
    return t.intensity ?? t.arousal ?? 0;
}
/**
 * Computes the mean (μ) of an array of numbers.
 */
function computeMean(values) {
    if (values.length === 0)
        return 0;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / values.length;
}
/**
 * Computes the variance (σ²) of an array of numbers given its mean.
 */
function computeVariance(values, mean) {
    if (values.length === 0)
        return 0;
    const sqDiffs = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    return sqDiffs / values.length;
}
/**
 * Computes the skewness of an array of numbers given mean and standard deviation.
 * Skewness = (1/N * Σ(x_i - μ)³) / σ³
 */
function computeSkewness(values, mean, stdDev) {
    if (values.length === 0 || stdDev === 0)
        return 0;
    const m3 = values.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / values.length;
    return m3 / Math.pow(stdDev, 3);
}
/**
 * Checks whether a target track's intensity can reach baseline intensity via intermediate tracks
 * in candidate pool such that no single step exceeds maxStep (0.28).
 */
function isReachableFromBaseline(target, pool, baseline, maxStep = 0.28) {
    const targetVal = getTrackEnergy(target);
    if (Math.abs(targetVal - baseline) <= maxStep)
        return true;
    if (targetVal > baseline) {
        const intermediates = pool
            .filter(t => t.id !== target.id && getTrackEnergy(t) >= baseline && getTrackEnergy(t) <= targetVal)
            .map(t => getTrackEnergy(t))
            .sort((a, b) => a - b);
        let current = baseline;
        for (const val of intermediates) {
            if (val - current <= maxStep) {
                current = val;
            }
        }
        return targetVal - current <= maxStep;
    }
    else {
        const intermediates = pool
            .filter(t => t.id !== target.id && getTrackEnergy(t) <= baseline && getTrackEnergy(t) >= targetVal)
            .map(t => getTrackEnergy(t))
            .sort((a, b) => b - a);
        let current = baseline;
        for (const val of intermediates) {
            if (current - val <= maxStep) {
                current = val;
            }
        }
        return current - targetVal <= maxStep;
    }
}
/**
 * Computes transition metrics (mean delta, max delta, jarring jumps count, smoothness score).
 * Jarring Jump = TRUE if ΔE > 0.35.
 * Smoothness Score = max(0, 100 - meanDeltaEnergy * 100).
 */
function computeSmoothnessScore(tracks) {
    if (tracks.length < 2) {
        return { meanDelta: 0, maxDelta: 0, jarringJumps: 0, score: 100 };
    }
    let totalDelta = 0;
    let maxDelta = 0;
    let jarringJumps = 0;
    for (let i = 0; i < tracks.length - 1; i++) {
        const delta = Math.abs(getTrackEnergy(tracks[i + 1]) - getTrackEnergy(tracks[i]));
        totalDelta += delta;
        if (delta > maxDelta)
            maxDelta = delta;
        if (delta > 0.35)
            jarringJumps++;
    }
    const meanDelta = totalDelta / (tracks.length - 1);
    const score = Math.max(0, Number((100 - meanDelta * 100).toFixed(2)));
    return {
        meanDelta: Number(meanDelta.toFixed(4)),
        maxDelta: Number(maxDelta.toFixed(4)),
        jarringJumps,
        score
    };
}
/**
 * Core Frame Algorithm Pipeline (Fully Dynamic across High, Medium, and Low-Energy Playlists).
 * Sequences input music track pool into a 3-Act Cinematic Narrative Arc.
 *
 * ACT I: Exposition (Character Baseline, anchored μ ± 0.10, flat trajectory ΔE ≤ 0.10)
 * ACT II: Dynamic Arc (Climax or Ambient Valley, Auto-detected via Skewness)
 * ACT III: Resolution (Strict Monotonic Glideway or Escalation)
 */
function processFrameAlgorithm(inputTracks) {
    if (inputTracks.length === 0) {
        return {
            acceptedTracks: [],
            rejectedTracks: [],
            metrics: {
                baselineIntensity: 0,
                baselineArousal: 0,
                meanDeltaEnergy: 0,
                maxDeltaEnergy: 0,
                jarringJumps: 0,
                smoothnessScore: 100,
                skewness: 0,
                variance: 0,
                actDirection: 'SPIKE_AND_TANK'
            },
            smoothnessScore: 100
        };
    }
    // --- Phase A: Pre-Calculation & Theme Extraction ---
    const initialIntensities = inputTracks.map(t => getTrackEnergy(t));
    const baselineIntensity = computeMean(initialIntensities);
    const variance = computeVariance(initialIntensities, baselineIntensity);
    const stdDev = Math.sqrt(variance);
    const skewness = computeSkewness(initialIntensities, baselineIntensity, stdDev);
    // Dynamically determine Act Direction:
    const actDirection = skewness >= 0 ? 'SPIKE_AND_TANK' : 'TANK_AND_SPIKE';
    // --- Phase B: Rejection Filter (Hard Gates) ---
    const rejectedTracks = [];
    let candidatePool = [...inputTracks];
    // Gate 1: Boundary Stall (< 65 BPM or > 170 BPM)
    // Low/high BPM tracks are NOT rejected needlessly if they can be smoothly bridged without causing a step > 0.28
    const bpmPassed = [];
    for (const track of candidatePool) {
        if (track.bpm < 65 || track.bpm > 170) {
            const reachable = isReachableFromBaseline(track, candidatePool, baselineIntensity, 0.28);
            if (!reachable) {
                rejectedTracks.push({
                    track,
                    reason: `Boundary Stall: Extreme BPM outlier (${track.bpm} BPM < 65 or > 170) with no bridge track available`
                });
            }
            else {
                bpmPassed.push(track);
            }
        }
        else {
            bpmPassed.push(track);
        }
    }
    candidatePool = bpmPassed;
    // Gate 2: Climax / Valley Bloat
    if (actDirection === 'SPIKE_AND_TANK') {
        const peakTracks = candidatePool.filter(t => getTrackEnergy(t) > 0.75);
        if (peakTracks.length > 2) {
            peakTracks.sort((a, b) => getTrackEnergy(b) - getTrackEnergy(a));
            const allowedPeakIds = new Set(peakTracks.slice(0, 2).map(t => t.id));
            const climaxPassed = [];
            for (const track of candidatePool) {
                if (getTrackEnergy(track) > 0.75 && !allowedPeakIds.has(track.id)) {
                    rejectedTracks.push({
                        track,
                        reason: `Climax Bloat: Exceeds top 2 extreme peak tracks (${getTrackEnergy(track).toFixed(2)} intensity > 0.75)`
                    });
                }
                else {
                    climaxPassed.push(track);
                }
            }
            candidatePool = climaxPassed;
        }
    }
    else {
        const valleyTracks = candidatePool.filter(t => getTrackEnergy(t) < 0.15);
        if (valleyTracks.length > 2) {
            valleyTracks.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
            const allowedValleyIds = new Set(valleyTracks.slice(0, 2).map(t => t.id));
            const valleyPassed = [];
            for (const track of candidatePool) {
                if (getTrackEnergy(track) < 0.15 && !allowedValleyIds.has(track.id)) {
                    rejectedTracks.push({
                        track,
                        reason: `Valley Bloat: Exceeds bottom 2 extreme valley tracks (${getTrackEnergy(track).toFixed(2)} intensity < 0.15)`
                    });
                }
                else {
                    valleyPassed.push(track);
                }
            }
            candidatePool = valleyPassed;
        }
    }
    // Gate 3: Step Violations / Transition Outliers (Δ Intensity > 0.28 from baseline with no bridge tracks)
    const transitionPassed = [];
    for (const track of candidatePool) {
        const distFromBaseline = Math.abs(getTrackEnergy(track) - baselineIntensity);
        if (distFromBaseline > 0.28) {
            const reachable = isReachableFromBaseline(track, candidatePool, baselineIntensity, 0.28);
            if (!reachable) {
                rejectedTracks.push({
                    track,
                    reason: `Transition Outlier: Δ Intensity (${distFromBaseline.toFixed(2)}) > 0.28 from baseline with no bridge tracks available`
                });
            }
            else {
                transitionPassed.push(track);
            }
        }
        else {
            transitionPassed.push(track);
        }
    }
    candidatePool = transitionPassed;
    // --- Phase C: 3-Act State Machine Assembly ---
    const totalAccepted = candidatePool.length;
    if (totalAccepted === 0) {
        return {
            acceptedTracks: [],
            rejectedTracks,
            metrics: {
                baselineIntensity: Number(baselineIntensity.toFixed(4)),
                baselineArousal: Number(baselineIntensity.toFixed(4)),
                meanDeltaEnergy: 0,
                maxDeltaEnergy: 0,
                jarringJumps: 0,
                smoothnessScore: 0,
                skewness: Number(skewness.toFixed(4)),
                variance: Number(variance.toFixed(4)),
                actDirection
            },
            smoothnessScore: 0
        };
    }
    // 1. Calculate Act Allocation Counts (Act I: 30%, Act II: 45%, Act III: 25%)
    const act1Count = Math.max(1, Math.round(totalAccepted * 0.30));
    const act3Count = Math.max(1, Math.round(totalAccepted * 0.25));
    const act2Count = Math.max(1, totalAccepted - act1Count - act3Count);
    let pool = [...candidatePool];
    // 2. ACT I: Exposition (Character Baseline)
    // Anchored around baseline μ ± 0.10 (dynamically matching low/high baseline)
    const act1Candidates = pool
        .filter(t => Math.abs(getTrackEnergy(t) - baselineIntensity) <= 0.10)
        .sort((a, b) => Math.abs(getTrackEnergy(a) - baselineIntensity) - Math.abs(getTrackEnergy(b) - baselineIntensity));
    let act1Tracks = [];
    if (act1Candidates.length >= act1Count) {
        act1Tracks = act1Candidates.slice(0, act1Count);
    }
    else {
        pool.sort((a, b) => Math.abs(getTrackEnergy(a) - baselineIntensity) - Math.abs(getTrackEnergy(b) - baselineIntensity));
        act1Tracks = pool.slice(0, act1Count);
    }
    const act1Ids = new Set(act1Tracks.map(t => t.id));
    pool = pool.filter(t => !act1Ids.has(t.id));
    // Sequence Act I: flat, gentle trajectory around baseline
    act1Tracks.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
    // 3. Divide remaining pool between Act II (~45%) and Act III (~25%)
    pool.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
    let act2Pool = [];
    let act3Tracks = [];
    if (actDirection === 'SPIKE_AND_TANK') {
        act3Tracks = pool.slice(0, act3Count);
        act2Pool = pool.slice(act3Count);
        // ACT II: Dynamic Arc (Climax Ramp to peak 1-2 tracks at ~60% mark)
        // Interleave non-climax tracks so rising and falling phases are evenly matched
        act2Pool.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
        const climaxTrack = act2Pool[act2Pool.length - 1];
        const nonClimax = act2Pool.slice(0, act2Pool.length - 1);
        const climaxTargetIdx = Math.floor((act2Pool.length - 1) * 0.5);
        const risingTracks = [];
        const fallingTracks = [];
        nonClimax.forEach((track, idx) => {
            if (idx % 2 === 0 && risingTracks.length < climaxTargetIdx) {
                risingTracks.push(track);
            }
            else {
                fallingTracks.push(track);
            }
        });
        risingTracks.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
        fallingTracks.sort((a, b) => getTrackEnergy(b) - getTrackEnergy(a));
        act2Pool = [...risingTracks, climaxTrack, ...fallingTracks];
    }
    else {
        // TANK_AND_SPIKE (Ambient Valley Narrative Arc for Low-Energy Pools)
        act3Tracks = pool.slice(pool.length - act3Count);
        act2Pool = pool.slice(0, pool.length - act3Count);
        act2Pool.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
        const valleyTrack = act2Pool[0];
        const nonValley = act2Pool.slice(1);
        const valleyTargetIdx = Math.floor((act2Pool.length - 1) * 0.5);
        const fallingTracks = [];
        const risingTracks = [];
        nonValley.forEach((track, idx) => {
            if (idx % 2 === 0 && fallingTracks.length < valleyTargetIdx) {
                fallingTracks.push(track);
            }
            else {
                risingTracks.push(track);
            }
        });
        fallingTracks.sort((a, b) => getTrackEnergy(b) - getTrackEnergy(a));
        risingTracks.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
        act2Pool = [...fallingTracks, valleyTrack, ...risingTracks];
    }
    // 4. ACT III: Resolution (STRICT Monotonic Glideway or Escalation)
    if (actDirection === 'SPIKE_AND_TANK') {
        // Monotonic Downward Glideway (E_k <= E_{k-1})
        act3Tracks.sort((a, b) => getTrackEnergy(b) - getTrackEnergy(a));
    }
    else {
        // Monotonic Upward Escalation (E_k >= E_{k-1})
        act3Tracks.sort((a, b) => getTrackEnergy(a) - getTrackEnergy(b));
    }
    // Assemble raw combined track sequence
    let fullRaw = [...act1Tracks, ...act2Pool, ...act3Tracks];
    // Re-assign act markers based on track index boundaries
    const finalAct1 = fullRaw.slice(0, act1Count).map(t => ({ ...t, act: 'ACT_I' }));
    const finalAct2 = fullRaw.slice(act1Count, act1Count + act2Count).map(t => ({ ...t, act: 'ACT_II' }));
    const finalAct3 = fullRaw.slice(act1Count + act2Count).map(t => ({ ...t, act: 'ACT_III' }));
    const acceptedTracks = [...finalAct1, ...finalAct2, ...finalAct3];
    const smoothness = computeSmoothnessScore(acceptedTracks);
    return {
        acceptedTracks,
        rejectedTracks,
        metrics: {
            baselineIntensity: Number(baselineIntensity.toFixed(4)),
            baselineArousal: Number(baselineIntensity.toFixed(4)),
            meanDeltaEnergy: smoothness.meanDelta,
            maxDeltaEnergy: smoothness.maxDelta,
            jarringJumps: smoothness.jarringJumps,
            smoothnessScore: smoothness.score,
            skewness: Number(skewness.toFixed(4)),
            variance: Number(variance.toFixed(4)),
            actDirection
        },
        smoothnessScore: smoothness.score
    };
}
exports.processFrameEngine = processFrameAlgorithm;
