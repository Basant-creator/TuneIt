import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DRIFT_PROMPT = `You are a precise music analytics data daemon. Analyze the provided YouTube track title, channel name, and description tags. 
Your goal is to estimate the BPM, evaluate a "Sonic Intensity" score, and write a 10 to 15 word concise vibe review of the track.

Intensity scale guidelines:
- 0.0 to 0.3: Ambient, dreamy, smooth synth pads, floating (e.g., Resonance by HOME, Lofi).
- 0.4 to 0.6: Mid-intensity, steady low-key drums, lo-fi groove, slowed-down chill beats, commercial pop/r&b.
- 0.7 to 1.0: Aggressive, harsh distortion, heavy bass cowbells, loud phonk, frantic percussion, metal, gym hip-hop.

Return strictly a raw JSON object with keys:
- "estimated_bpm" (integer)
- "intensity_score" (float rounded to two decimal places)
- "vibe_review" (string, 10 to 15 words review summarizing the song style and mood)

Do not include markdown code block formatting.`;

interface TestTrack {
  id: string;
  title: string;
  artist: string;
  category: 'Mainstream' | 'Mid-Tier' | 'Long-Tail/Obscure';
  genre: string;
  groundTruthBpm?: number;
}

const TEST_TRACKS: TestTrack[] = [
  // Mainstream (1-8)
  { id: '1', title: 'Opus', artist: 'Eric Prydz', category: 'Mainstream', genre: 'Progressive House', groundTruthBpm: 126 },
  { id: '2', title: 'One More Time', artist: 'Daft Punk', category: 'Mainstream', genre: 'French House', groundTruthBpm: 123 },
  { id: '3', title: 'Blinding Lights', artist: 'The Weeknd', category: 'Mainstream', genre: 'Synthwave / Pop', groundTruthBpm: 171 },
  { id: '4', title: 'bad guy', artist: 'Billie Eilish', category: 'Mainstream', genre: 'Electropop', groundTruthBpm: 135 },
  { id: '5', title: 'Hotline Bling', artist: 'Drake', category: 'Mainstream', genre: 'R&B / Hip-Hop' },
  { id: '6', title: 'Shake It Off', artist: 'Taylor Swift', category: 'Mainstream', genre: 'Pop' },
  { id: '7', title: 'Master of Puppets', artist: 'Metallica', category: 'Mainstream', genre: 'Thrash Metal' },
  { id: '8', title: 'So What', artist: 'Miles Davis', category: 'Mainstream', genre: 'Modal Jazz' },

  // Mid-Tier (9-14)
  { id: '9', title: 'Glue', artist: 'Bicep', category: 'Mid-Tier', genre: 'Breakbeat', groundTruthBpm: 130 },
  { id: '10', title: 'Delilah (pull me out of this)', artist: 'Fred again..', category: 'Mid-Tier', genre: 'Electronic / House' },
  { id: '11', title: 'Losing It', artist: 'FISHER', category: 'Mid-Tier', genre: 'Tech House', groundTruthBpm: 125 },
  { id: '12', title: 'Resonance', artist: 'HOME', category: 'Mid-Tier', genre: 'Chillwave', groundTruthBpm: 170 },
  { id: '13', title: 'Cirrus', artist: 'Bonobo', category: 'Mid-Tier', genre: 'Downtempo' },
  { id: '14', title: '(It Goes Like) Nanana', artist: 'Peggy Gou', category: 'Mid-Tier', genre: 'Dance Pop' },

  // Long-Tail / Obscure (15-20)
  { id: '15', title: 'A Walk', artist: 'Tycho', category: 'Long-Tail/Obscure', genre: 'Chillwave / Ambient', groundTruthBpm: 80 },
  { id: '16', title: 'Asadachi', artist: 'Ichiko Aoba', category: 'Long-Tail/Obscure', genre: 'Indie Folk / Acoustic' },
  { id: '17', title: 'Archangel', artist: 'Burial', category: 'Long-Tail/Obscure', genre: 'Future Garage' },
  { id: '18', title: 'It Took the Night to Believe', artist: 'Sunn O)))', category: 'Long-Tail/Obscure', genre: 'Drone Metal' },
  { id: '19', title: 'Looped', artist: 'Kiasmos', category: 'Long-Tail/Obscure', genre: 'Minimal Techno' },
  { id: '20', title: 'These Chains', artist: 'Mid-Air Thief', category: 'Long-Tail/Obscure', genre: 'Neo-Psychedelia / Korean Indie' }
];

interface IterationResult {
  estimated_bpm: number;
  intensity_score: number;
  vibe_review: string;
}

interface TrackSummary {
  track: TestTrack;
  iterations: IterationResult[];
  bpmMean: number;
  bpmStdDev: number;
  bpmMin: number;
  bpmMax: number;
  bpmRange: number;
  intensityMean: number;
  intensityStdDev: number;
  intensityMin: number;
  intensityMax: number;
  intensityRange: number;
  flipsMentalDriftGate: boolean; // Mental Drift Hard Vibe Gate: 104 <= BPM <= 136
  gateStatuses: boolean[];
  groundTruthBpm?: number;
  absError?: number;
  errorFlipsGate?: boolean;
}

function calcStats(nums: number[]) {
  const n = nums.length;
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min;
  return { mean, stdDev, min, max, range };
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeAnalyzeTrack(track: TestTrack, iterIndex: number): Promise<IterationResult> {
  const inputStr = `Title: "${track.title}"\nChannel: "${track.artist}"\nTags: ["${track.genre}"]`;

  let attempts = 0;
  while (attempts < 6) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: DRIFT_PROMPT + '\n\nInput Payload:\n' + inputStr }] },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (typeof parsed.estimated_bpm === 'number') {
          return parsed as IterationResult;
        }
      }
    } catch (err: any) {
      attempts++;
      let waitMs = 35000;
      const msg = err?.message || '';
      if (msg.includes('retryDelay')) {
        const match = msg.match(/retryDelay":"(\d+)s"/);
        if (match && match[1]) {
          waitMs = (parseInt(match[1], 10) + 5) * 1000;
        }
      }
      console.warn(`    [Gemini 429 Retry ${attempts}] "${track.title}" iter ${iterIndex + 1}: Waiting ${waitMs / 1000}s...`);
      await delay(waitMs);
    }
  }

  return { estimated_bpm: 120, intensity_score: 0.5, vibe_review: 'Fallback default' };
}

async function runBenchmark() {
  console.log('================================================================');
  console.log('Starting TuneIt Tier 1 Gemini 2.5 Flash Incremental Audit');
  console.log('Running 20 tracks x 8 iterations = 160 Gemini API calls...');
  console.log('================================================================\n');

  // Load existing results if resuming
  let summaries: TrackSummary[] = [];
  if (fs.existsSync('scripts/benchmarkResults.json')) {
    try {
      summaries = JSON.parse(fs.readFileSync('scripts/benchmarkResults.json', 'utf8'));
      console.log(`Loaded ${summaries.length} existing completed track summaries.`);
    } catch (e) {
      summaries = [];
    }
  }

  for (let i = 0; i < TEST_TRACKS.length; i++) {
    const track = TEST_TRACKS[i];
    
    // Skip if track already fully processed with 8 iterations
    const existingIndex = summaries.findIndex(s => s.track.id === track.id);
    if (existingIndex !== -1 && summaries[existingIndex].iterations.length >= 8) {
      console.log(`[${i + 1}/20] Already completed: "${track.title}" by ${track.artist}`);
      continue;
    }

    console.log(`[${i + 1}/20] Processing "${track.title}" by ${track.artist} (${track.category})...`);

    const iterations: IterationResult[] = existingIndex !== -1 ? summaries[existingIndex].iterations : [];

    while (iterations.length < 8) {
      const j = iterations.length;
      const res = await safeAnalyzeTrack(track, j);
      iterations.push(res);
      console.log(`  Run ${j + 1}/8: BPM=${res.estimated_bpm}, Int=${res.intensity_score}`);
      
      // Save incremental data right after each iteration
      const bpms = iterations.map(it => it.estimated_bpm);
      const intensities = iterations.map(it => it.intensity_score);

      const bpmStats = calcStats(bpms);
      const intStats = calcStats(intensities);

      const gateStatuses = bpms.map(bpm => bpm >= 104 && bpm <= 136);
      const hasTrue = gateStatuses.includes(true);
      const hasFalse = gateStatuses.includes(false);
      const flipsMentalDriftGate = hasTrue && hasFalse;

      let absError: number | undefined;
      let errorFlipsGate: boolean | undefined;

      if (track.groundTruthBpm !== undefined) {
        absError = Math.abs(bpmStats.mean - track.groundTruthBpm);
        const groundTruthInGate = track.groundTruthBpm >= 104 && track.groundTruthBpm <= 136;
        const geminiMeanInGate = bpmStats.mean >= 104 && bpmStats.mean <= 136;
        errorFlipsGate = groundTruthInGate !== geminiMeanInGate;
      }

      const summary: TrackSummary = {
        track,
        iterations,
        bpmMean: parseFloat(bpmStats.mean.toFixed(2)),
        bpmStdDev: parseFloat(bpmStats.stdDev.toFixed(2)),
        bpmMin: bpmStats.min,
        bpmMax: bpmStats.max,
        bpmRange: bpmStats.range,
        intensityMean: parseFloat(intStats.mean.toFixed(2)),
        intensityStdDev: parseFloat(intStats.stdDev.toFixed(2)),
        intensityMin: intStats.min,
        intensityMax: intStats.max,
        intensityRange: parseFloat(intStats.range.toFixed(2)),
        flipsMentalDriftGate,
        gateStatuses,
        groundTruthBpm: track.groundTruthBpm,
        absError: absError !== undefined ? parseFloat(absError.toFixed(2)) : undefined,
        errorFlipsGate,
      };

      if (existingIndex !== -1) {
        summaries[existingIndex] = summary;
      } else {
        summaries.push(summary);
      }

      fs.writeFileSync('scripts/benchmarkResults.json', JSON.stringify(summaries, null, 2));

      await delay(13000); // 13s delay between calls = ~4.6 RPM (safely under 5 RPM limit)
    }
  }

  console.log('\n================================================================');
  console.log('BENCHMARK COMPLETE! Full data saved to scripts/benchmarkResults.json');
  console.log('================================================================');
}

runBenchmark().catch(console.error);
