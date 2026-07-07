"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterDriftPool = filterDriftPool;
exports.generateDriftPlaylist = generateDriftPlaylist;
// 1. Filter out high-intensity, jarring tracks completely
function filterDriftPool(tracks) {
    const MAXIMUM_INTENSITY_CEILING = 0.65;
    return tracks.filter(track => track.intensityScore <= MAXIMUM_INTENSITY_CEILING);
}
// 2. The Weighted Distance Function
function calculateSonicDistance(songA, songB) {
    const bpmWeight = 1.0;
    const intensityWeight = 80.0; // Heavily penalizes intensity shifts to keep the vibe smooth
    const bpmDiff = Math.abs(songA.estimatedBpm - songB.estimatedBpm) * bpmWeight;
    const intensityDiff = Math.abs(songA.intensityScore - songB.intensityScore) * intensityWeight;
    return bpmDiff + intensityDiff;
}
// 3. The Chaining Engine (Builds the Floating Playlist Sequence)
function generateDriftPlaylist(rawImportedTracks) {
    // Step A: Purge the disruptive high-intensity tracks
    let pool = filterDriftPool(rawImportedTracks);
    if (pool.length === 0)
        return [];
    let rearrangedPlaylist = [];
    // Step B: Start with a perfect mid-vibe baseline track (around 120 BPM)
    pool.sort((a, b) => Math.abs(a.estimatedBpm - 120) - Math.abs(b.estimatedBpm - 120));
    let currentTrack = pool.shift();
    if (currentTrack) {
        rearrangedPlaylist.push(currentTrack);
    }
    // Step C: Link next closest tracks step-by-step
    while (pool.length > 0 && currentTrack) {
        let nearestIndex = 0;
        let shortestDistance = Infinity;
        for (let i = 0; i < pool.length; i++) {
            let distance = calculateSonicDistance(currentTrack, pool[i]);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestIndex = i;
            }
        }
        // Move the closest matching track out of the pool and onto the playlist
        currentTrack = pool.splice(nearestIndex, 1)[0];
        rearrangedPlaylist.push(currentTrack);
    }
    return rearrangedPlaylist;
}
