export interface DriftTrack {
    videoId: string;
    title: string;
    artist: string;
    estimatedBpm: number;
    intensityScore: number;
    originalIndex: number;
}
  
// Removed filterDriftPool to handle filtering inside the generator function
  
// 2. The Weighted Distance Function
function calculateSonicDistance(songA: DriftTrack, songB: DriftTrack) {
    const bpmWeight = 1.0;
    const intensityWeight = 80.0; // Heavily penalizes intensity shifts to keep the vibe smooth
  
    const bpmDiff = Math.abs(songA.estimatedBpm - songB.estimatedBpm) * bpmWeight;
    const intensityDiff = Math.abs(songA.intensityScore - songB.intensityScore) * intensityWeight;
  
    return bpmDiff + intensityDiff;
}
  
// 3. The Chaining Engine (Builds the Floating Playlist Sequence)
export function generateDriftPlaylist(rawImportedTracks: DriftTrack[]) {
    const MAXIMUM_INTENSITY_CEILING = 0.65; 
    let pool: DriftTrack[] = [];
    let harshTracks: DriftTrack[] = [];

    // Step A: Separate the disruptive high-intensity tracks
    for (const track of rawImportedTracks) {
        if (track.intensityScore > MAXIMUM_INTENSITY_CEILING) {
            harshTracks.push(track);
        } else {
            pool.push(track);
        }
    }

    if (pool.length === 0) return { tracks: [], harshTracks };
  
    let rearrangedPlaylist: DriftTrack[] = [];
    
    // Step B: Start with the lowest BPM track in the pool as the baseline
    pool.sort((a, b) => a.estimatedBpm - b.estimatedBpm);
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
  
    return { tracks: rearrangedPlaylist, harshTracks };
}
