/**
 * Engine behaviour probe (scripts/probeEngineBehaviour.ts)
 *
 * Diagnostic, not a pass/fail test. Runs each engine over playlists shaped like
 * real genres rather than uniform noise, and reports what a user would actually
 * get back: retention, artist clumping, track accounting and harmonic honesty.
 *
 * Genre-shaped input is the point. Uniform random data hides gates that are
 * tuned to one tempo band, which is exactly how Drift came to return 0% of a
 * lo-fi playlist while looking healthy on synthetic benchmarks.
 *
 * Run with:  npm run probe:engines
 */

import {
  runFlowEngine,
  SUPPORTED_MODES,
  ENGINE_BY_MODE,
  EnrichedTrack,
} from '../src/services/flowEngineService';
import { resolveDriftGate } from '../src/utils/driftAlgorithm';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Profile {
  name: string;
  bpm: [number, number];
  intensity: [number, number];
  artists: number;
}

/** BPM/intensity bands roughly matching where these genres actually sit. */
const PROFILES: Profile[] = [
  { name: 'Lo-fi / study', bpm: [70, 92], intensity: [0.12, 0.35], artists: 12 },
  { name: 'Acoustic / singer-songwriter', bpm: [75, 105], intensity: [0.2, 0.45], artists: 14 },
  { name: 'Pop / commercial radio', bpm: [98, 132], intensity: [0.4, 0.72], artists: 18 },
  { name: 'House / synthwave', bpm: [118, 130], intensity: [0.45, 0.75], artists: 10 },
  { name: 'Hip-hop / drill', bpm: [85, 145], intensity: [0.55, 0.9], artists: 16 },
  { name: 'Metal / gym', bpm: [140, 180], intensity: [0.72, 0.97], artists: 11 },
  { name: 'Eclectic mixed bag', bpm: [70, 175], intensity: [0.1, 0.95], artists: 30 },
];

function buildPlaylist(profile: Profile, size: number, seed = 42): EnrichedTrack[] {
  const rand = mulberry32(seed);
  return Array.from({ length: size }, (_, i) => {
    const [bLo, bHi] = profile.bpm;
    const [iLo, iHi] = profile.intensity;
    return {
      videoId: `v${i}`,
      title: `Track ${i + 1}`,
      artist: `Artist ${Math.floor(rand() * profile.artists) + 1}`,
      estimatedBpm: Math.round(bLo + rand() * (bHi - bLo)),
      intensityScore: Number((iLo + rand() * (iHi - iLo)).toFixed(2)),
      originalIndex: i,
    };
  });
}

/** Longest run of consecutive tracks by the same artist. */
function maxArtistRun(tracks: Array<{ artist: string }>): number {
  let best = 0;
  let run = 0;
  let prev = '';
  for (const t of tracks) {
    run = t.artist === prev ? run + 1 : 1;
    prev = t.artist;
    if (run > best) best = run;
  }
  return best;
}

const PLAYLIST_SIZE = 40;
const retentionTrouble: string[] = [];
const accountingTrouble: string[] = [];
let worstRun = 0;

console.log('TuneIt — engine behaviour probe');
console.log(`Playlists of ${PLAYLIST_SIZE} tracks, shaped by genre.\n`);

console.log('RETENTION (tracks returned / tracks given)');
console.log('='.repeat(84));
console.log(
  'Profile'.padEnd(32) + SUPPORTED_MODES.map((m) => ENGINE_BY_MODE[m].label.padStart(12)).join('')
);
console.log('-'.repeat(84));

for (const profile of PROFILES) {
  const pool = buildPlaylist(profile, PLAYLIST_SIZE);
  const cells: string[] = [];

  for (const mode of SUPPORTED_MODES) {
    const r = runFlowEngine(mode, pool);
    const pct = Math.round((r.acceptedCount / r.originalCount) * 100);
    cells.push(`${r.acceptedCount}/${PLAYLIST_SIZE} ${String(pct).padStart(3)}%`.padStart(12));

    if (pct < 50) {
      retentionTrouble.push(
        `${ENGINE_BY_MODE[mode].label} keeps only ${pct}% of a "${profile.name}" playlist`
      );
    }

    // Every track must be either kept or reported as excluded. Anything else
    // has vanished with no explanation the user could ever see.
    const unaccounted = r.originalCount - r.acceptedCount - r.filteredCount;
    if (unaccounted !== 0) {
      accountingTrouble.push(
        `${ENGINE_BY_MODE[mode].label} on "${profile.name}": ${unaccounted} track(s) neither kept nor reported`
      );
    }
  }
  console.log(profile.name.padEnd(32) + cells.join(''));
}

console.log('\n\nDRIFT GATE — canonical window, or re-centred on the playlist?');
console.log('='.repeat(84));
for (const profile of PROFILES) {
  const pool = buildPlaylist(profile, PLAYLIST_SIZE);
  const gate = resolveDriftGate(
    pool.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      estimatedBpm: t.estimatedBpm,
      intensityScore: t.intensityScore,
      originalIndex: t.originalIndex ?? 0,
    }))
  );
  console.log(
    `  ${profile.name.padEnd(30)} ${(gate.adaptive ? 'adaptive' : 'canonical').padEnd(10)}` +
      ` ${Math.round(gate.lowerBpm)}-${Math.round(gate.upperBpm)} BPM, intensity <= ${gate.maxIntensity}`
  );
}

console.log('\n\nARTIST CLUMPING (longest run of the same artist back-to-back)');
console.log('='.repeat(84));
console.log(
  'Profile'.padEnd(32) + SUPPORTED_MODES.map((m) => ENGINE_BY_MODE[m].label.padStart(12)).join('')
);
console.log('-'.repeat(84));

for (const profile of PROFILES) {
  const pool = buildPlaylist(profile, PLAYLIST_SIZE);
  const cells = SUPPORTED_MODES.map((mode) => {
    const run = maxArtistRun(runFlowEngine(mode, pool).tracks);
    if (run > worstRun) worstRun = run;
    return `${run}x`.padStart(12);
  });
  console.log(profile.name.padEnd(32) + cells.join(''));
}

console.log('\n\nHARMONIC HONESTY — does the same song keep the same key?');
console.log('='.repeat(84));
{
  // The same song uploaded twice has two videoIds. A musical key must not
  // change between them. The old deriveCamelotKey hashed the id, so it did.
  const withKey = (videoId: string): EnrichedTrack[] => [
    {
      videoId,
      title: 'Same Song',
      artist: 'Same Artist',
      estimatedBpm: 120,
      intensityScore: 0.5,
      camelotKey: '8A',
    },
    { videoId: 'x1', title: 'Other', artist: 'Other', estimatedBpm: 122, intensityScore: 0.55 },
  ];

  const a = runFlowEngine('bu', withKey('upload_A'));
  const b = runFlowEngine('bu', withKey('upload_B'));
  const orderA = a.tracks.map((t) => t.title).join(' | ');
  const orderB = b.tracks.map((t) => t.title).join(' | ');
  console.log(`  Supplied key "8A", two uploads -> same ordering: ${orderA === orderB ? 'yes ✓' : 'NO ✗'}`);

  // With no key supplied, nothing should claim a harmonic match.
  const noKey = runFlowEngine('bu', [
    { videoId: 'n1', title: 'A', artist: 'A', estimatedBpm: 120, intensityScore: 0.3 },
    { videoId: 'n2', title: 'B', artist: 'B', estimatedBpm: 124, intensityScore: 0.45 },
    { videoId: 'n3', title: 'C', artist: 'C', estimatedBpm: 128, intensityScore: 0.6 },
  ]);
  console.log(`  No key supplied -> engine ran without inventing one: ${noKey.acceptedCount === 3 ? 'yes ✓' : 'NO ✗'}`);
}

console.log('\n\nDETERMINISM — same input twice');
console.log('='.repeat(84));
for (const mode of SUPPORTED_MODES) {
  const pool = buildPlaylist(PROFILES[4], PLAYLIST_SIZE);
  const first = runFlowEngine(mode, pool).tracks.map((t) => t.videoId).join(',');
  const second = runFlowEngine(mode, pool).tracks.map((t) => t.videoId).join(',');
  console.log(
    `  ${ENGINE_BY_MODE[mode].label.padEnd(10)} ${first === second ? 'stable ✓' : 'NON-DETERMINISTIC ✗'}`
  );
}

console.log('\n\nSUMMARY');
console.log('='.repeat(84));
console.log('Retention below 50%:');
if (retentionTrouble.length === 0) console.log('  none');
else retentionTrouble.forEach((t) => console.log(`  - ${t}`));

console.log('\nSilently dropped tracks (kept + excluded != input):');
if (accountingTrouble.length === 0) {
  console.log('  none — every track is either kept or reported as excluded');
} else {
  accountingTrouble.forEach((t) => console.log(`  - ${t}`));
}

console.log(`\nWorst artist run observed: ${worstRun} consecutive tracks by one artist.`);
