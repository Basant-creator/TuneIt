export interface DriftTrack {
    videoId: string;
    title: string;
    artist: string;
    estimatedBpm: number;
    intensityScore: number;
    originalIndex: number;
}
  
export interface RearrangedResponse {
    tracks: DriftTrack[];
    harshTracks: DriftTrack[];
}

/**
 * Calculates the sonic distance vector between two songs.
 * Penalizes large intensity shifts heavily to protect the vibe consistency.
 */
function calculateSonicDistance(songA: DriftTrack, songB: DriftTrack): number {
    const bpmWeight = 1.0;
    const intensityWeight = 80.0; 

    const bpmDiff = Math.abs(songA.estimatedBpm - songB.estimatedBpm) * bpmWeight;
    const intensityDiff = Math.abs(songA.intensityScore - songB.intensityScore) * intensityWeight;

    return bpmDiff + intensityDiff;
}

/**
 * Builds a floating, snake-like playlist sequence.
 * Filters out extreme tempos and high intensity tracks into a leftovers array.
 */
export function generateDriftPlaylist(rawImportedTracks: DriftTrack[]): RearrangedResponse {
    const MAXIMUM_INTENSITY_CEILING = 0.65; 
    const MAX_BPM_FLIGHT_VARIANCE = 15; // Keeps total tempo band within +/- 15 BPM of the median

    let initialPool: DriftTrack[] = [];
    let harshTracks: DriftTrack[] = [];
    let leftoverVibeBreakers: DriftTrack[] = [];

    // Step 1: Separate immediate high-intensity rule breakers
    for (const track of rawImportedTracks) {
        if (track.intensityScore > MAXIMUM_INTENSITY_CEILING) {
            harshTracks.push(track);
        } else {
            initialPool.push(track);
        }
    }

    if (initialPool.length === 0) {
        return { tracks: [], harshTracks };
    }

    // Step 2: Calculate Center Mass (Median BPM) to establish cruising altitude
    const sortedByBpm = [...initialPool].sort((a, b) => a.estimatedBpm - b.estimatedBpm);
    const medianBpm = sortedByBpm[Math.floor(sortedByBpm.length / 2)].estimatedBpm;

    // Step 3: Strict Tempo Isolation Gate
    let driftCorePool: DriftTrack[] = [];
    for (const track of initialPool) {
        if (Math.abs(track.estimatedBpm - medianBpm) > MAX_BPM_FLIGHT_VARIANCE) {
            leftoverVibeBreakers.push(track); // Sweeps wild fast/slow outliers to leftovers
        } else {
            driftCorePool.push(track);
        }
    }

    if (driftCorePool.length === 0) {
        return { tracks: [], harshTracks: [...harshTracks, ...leftoverVibeBreakers] };
    }

    let rearrangedPlaylist: DriftTrack[] = [];
    
    // Step 4: Seed the playlist using the track closest to your median baseline
    driftCorePool.sort((a, b) => Math.abs(a.estimatedBpm - medianBpm) - Math.abs(b.estimatedBpm - medianBpm));
    let currentTrack = driftCorePool.shift(); 
    if (currentTrack) {
        rearrangedPlaylist.push(currentTrack);
    }

    // Step 5: Greedy Nearest-Neighbor Loop across the safely bounded core pool
    while (driftCorePool.length > 0 && currentTrack) {
        let nearestIndex = 0;
        let shortestDistance = Infinity;

        for (let i = 0; i < driftCorePool.length; i++) {
            let distance = calculateSonicDistance(currentTrack, driftCorePool[i]);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestIndex = i;
            }
        }

        currentTrack = driftCorePool.splice(nearestIndex, 1)[0];
        rearrangedPlaylist.push(currentTrack);
    }

    // Combine your structural leftovers and raw harsh tracks for your UI bottom box
    const completeLeftovers = [...harshTracks, ...leftoverVibeBreakers];

    return { 
        tracks: rearrangedPlaylist, 
        harshTracks: completeLeftovers 
    };
}
