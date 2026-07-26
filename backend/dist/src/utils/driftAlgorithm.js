"use strict";
/**
 * Mental Drift Algorithm (v2.1 Ultra-Smooth)
 *
 * Rearranges a YouTube Music playlist based on a multi-feature distance metric,
 * look-ahead forward connectivity, and 2-opt trajectory smoothing for maximum flow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDriftPlaylist = generateDriftPlaylist;
/**
 * Calculates normalized distance between two tracks considering both BPM and Sonic Intensity.
 */
function calculateTrackDistance(a, b) {
    const normalizedBpmDelta = Math.abs(a.estimatedBpm - b.estimatedBpm) / 30;
    const intensityDelta = Math.abs(a.intensityScore - b.intensityScore);
    return 0.5 * normalizedBpmDelta + 0.5 * intensityDelta;
}
/**
 * 2-Opt Post-Processing Optimization Pass:
 * Swaps elements in the output sequence to eliminate any remaining localized energy drops or spikes.
 */
function optimizeSequenceFlow(tracks) {
    if (tracks.length <= 3)
        return tracks;
    const result = [...tracks];
    let improved = true;
    let passes = 0;
    const MAX_PASSES = 5;
    while (improved && passes < MAX_PASSES) {
        improved = false;
        passes++;
        for (let i = 0; i < result.length - 2; i++) {
            for (let j = i + 1; j < result.length - 1; j++) {
                // Calculate cost of current arrangement at boundaries i and j
                const currentCost = calculateTrackDistance(result[i], result[i + 1]) +
                    calculateTrackDistance(result[j], result[j + 1]);
                // Calculate cost if segment between i+1 and j is reversed
                const newCost = calculateTrackDistance(result[i], result[j]) +
                    calculateTrackDistance(result[i + 1], result[j + 1]);
                // If reversing the subsegment produces a smoother transition flow, swap
                if (newCost < currentCost - 0.02) {
                    // Reverse subsegment from i+1 to j using clean array destructuring
                    let left = i + 1;
                    let right = j;
                    while (left < right) {
                        [result[left], result[right]] = [result[right], result[left]];
                        left++;
                        right--;
                    }
                    improved = true;
                }
            }
        }
    }
    return result;
}
/**
 * Executes the Ultra-Smooth Mental Drift algorithm to rearrange a raw list of tracks.
 *
 * @param rawTracks The raw, unsorted playlist dataset
 * @returns An object containing the optimized playlist and any rejected harsh tracks
 */
function generateDriftPlaylist(rawTracks) {
    if (!rawTracks || rawTracks.length === 0) {
        return { tracks: [], harshTracks: [] };
    }
    // 1. Hard Vibe Gate
    const LOWER_BPM_BOUND = 104;
    const UPPER_BPM_BOUND = 136;
    const MAX_INTENSITY = 0.65;
    const isHarsh = (track) => track.intensityScore > MAX_INTENSITY ||
        track.estimatedBpm < LOWER_BPM_BOUND ||
        track.estimatedBpm > UPPER_BPM_BOUND;
    const filteredPool = rawTracks.filter((track) => !isHarsh(track));
    const harshTracks = rawTracks.filter(isHarsh);
    if (filteredPool.length === 0) {
        return { tracks: [], harshTracks };
    }
    // 2. Starter Seed Selection
    const sortedByBpm = [...filteredPool].sort((a, b) => a.estimatedBpm - b.estimatedBpm);
    const mid = Math.floor(sortedByBpm.length / 2);
    const medianBpm = sortedByBpm.length % 2 === 0
        ? (sortedByBpm[mid - 1].estimatedBpm + sortedByBpm[mid].estimatedBpm) / 2
        : sortedByBpm[mid].estimatedBpm;
    const { seedIndex } = filteredPool.reduce((best, track, i) => {
        const bpmDiff = Math.abs(track.estimatedBpm - medianBpm) / 30;
        const intensityDiff = Math.abs(track.intensityScore - 0.25);
        const score = bpmDiff + intensityDiff;
        return score < best.minScore ? { seedIndex: i, minScore: score } : best;
    }, { seedIndex: 0, minScore: Infinity });
    const playlist = [];
    const seedTrack = filteredPool.splice(seedIndex, 1)[0];
    playlist.push(seedTrack);
    // 3. Momentum & Look-Ahead Nearest-Neighbor Construction
    const historyQueue = [seedTrack];
    while (filteredPool.length > 0) {
        const currentTrack = playlist[playlist.length - 1];
        let trend = 0;
        if (historyQueue.length >= 3) {
            const firstIntensity = historyQueue[0].intensityScore;
            const thirdIntensity = historyQueue[2].intensityScore;
            if (thirdIntensity > firstIntensity + 0.05)
                trend = 1;
            else if (thirdIntensity < firstIntensity - 0.05)
                trend = -1;
        }
        let bestCandidateIndex = -1;
        let lowestScore = Infinity;
        for (let i = 0; i < filteredPool.length; i++) {
            const candidate = filteredPool[i];
            let score = calculateTrackDistance(currentTrack, candidate);
            if (trend === 1 && candidate.intensityScore > currentTrack.intensityScore + 0.15) {
                score += 0.20;
            }
            else if (trend === -1 && candidate.intensityScore < currentTrack.intensityScore - 0.15) {
                score += 0.20;
            }
            if (filteredPool.length > 2) {
                let minNextDist = Infinity;
                for (let j = 0; j < filteredPool.length; j++) {
                    if (i === j)
                        continue;
                    const dist = calculateTrackDistance(candidate, filteredPool[j]);
                    if (dist < minNextDist)
                        minNextDist = dist;
                }
                score += minNextDist * 0.25;
            }
            if (score < lowestScore) {
                lowestScore = score;
                bestCandidateIndex = i;
            }
        }
        if (bestCandidateIndex === -1)
            bestCandidateIndex = 0;
        const nextTrack = filteredPool.splice(bestCandidateIndex, 1)[0];
        playlist.push(nextTrack);
        historyQueue.push(nextTrack);
        if (historyQueue.length > 3)
            historyQueue.shift();
    }
    // 4. Post-Processing 2-Opt Sequence Flow Optimization
    const optimizedPlaylist = optimizeSequenceFlow(playlist);
    return { tracks: optimizedPlaylist, harshTracks };
}
