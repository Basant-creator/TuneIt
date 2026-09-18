import { GoogleGenAI } from '@google/genai';
import { googleConfig } from '../config/ytmusic';

// Reads through googleConfig so dotenv is guaranteed to have run first,
// regardless of module import order.
const ai = new GoogleGenAI({ apiKey: googleConfig.geminiApiKey });

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

Do not include markdown code block formatting.

[Input Sample]:
Title: "HOME - Resonance"
Channel: "Electronic Gems"
Tags: ["chillwave", "synthwave", "retro", "dreamy"]

[Output Sample]:
{"estimated_bpm": 120, "intensity_score": 0.18, "vibe_review": "Dreamy synthwave with floating analogue pads, nostalgic warmth, and smooth chillwave groove."}`;

const RECOMMENDATION_PROMPT = `You are an expert music curator and DJ sequencer daemon. Given a list of recent tracks in an optimized playlist, recommend 4 additional songs that seamlessly extend the playlist flow.

Return strictly a raw JSON array of objects, where each object has:
- "title" (string, song title)
- "artist" (string, artist name)
- "rationale" (string, 8-12 words explaining why this track fits the vibe flow)

Do not include markdown code block formatting.`;

export interface TrackMetadata {
  title: string;
  artist: string;
  tags: string[];
}

export interface AIAnalysisResult {
  estimated_bpm: number;
  intensity_score: number;
  vibe_review: string;
  /** Musical positivity, 0.0-1.0. Undefined when the model did not supply it. */
  valence?: number;
  /** Camelot wheel notation, e.g. "8A". Undefined when genuinely unknown —
   *  never fabricated, because the sequencing engines treat it as real. */
  camelot_key?: string;
}

export interface BatchTrackItem extends TrackMetadata {
  index: number;
}

export interface BatchAIAnalysisResult extends AIAnalysisResult {
  index: number;
}

export interface RecommendedTrackProposal {
  title: string;
  artist: string;
  rationale: string;
}

const BATCH_DRIFT_PROMPT = `You are a precise music analytics data daemon. Analyze the provided list of YouTube music tracks.
For each track, estimate its BPM ("estimated_bpm", integer 60-180) and its Sonic Intensity score ("intensity_score", float 0.0 to 1.0) based on title, channel name, and tags.

Intensity scale guidelines:
- 0.0 to 0.3: Ambient, dreamy, smooth synth pads, acoustic, lofi, floating.
- 0.4 to 0.6: Mid-intensity, steady low-key drums, lo-fi groove, pop, commercial r&b, soft indie.
- 0.7 to 1.0: Aggressive, harsh distortion, heavy bass cowbells, phonk, fast electronic, metal, gym hip-hop, drill.

Return strictly a raw JSON array of objects, matching the exact length and index of the input list. Each object must have:
- "index" (integer, matching input track index)
- "estimated_bpm" (integer)
- "intensity_score" (float STRICTLY between 0.0 and 1.0, two decimal places — never a 0-10 rating; 0.3 not 3)
- "valence" (float 0.0 to 1.0 — musical positivity: 0.0 is bleak/sad/menacing, 0.5 is neutral, 1.0 is bright/euphoric/triumphant)
- "camelot_key" (string, Camelot wheel notation "1A" to "12B", where A is minor and B is major — e.g. A minor is "8A", C major is "8B". Use null if you genuinely cannot tell.)
- "vibe_review" (string, 8 to 12 words)

Only give a camelot_key when you actually recognise the track or its style strongly implies one. A null is far better than a guess, because downstream harmonic mixing trusts this value.

Do not include markdown code block formatting.`;

export async function analyzeTrackMetadata(metadata: TrackMetadata): Promise<AIAnalysisResult | null> {
  const inputStr = `Title: "${metadata.title}"\nChannel: "${metadata.artist}"\nTags: ${JSON.stringify(metadata.tags)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        { role: 'user', parts: [{ text: DRIFT_PROMPT + '\n\nInput Payload:\n' + inputStr }] },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text) as AIAnalysisResult;
    }
    return null;
  } catch (error: any) {
    const isQuotaError =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuotaError) {
      console.warn(`[AIService] Gemini API Rate Limit Exceeded (429) for "${metadata.title}". Using heuristic fallback.`);
    } else {
      console.error('[AIService] Error analyzing track metadata with Gemini:', error?.message || error);
    }
    return null;
  }
}

/**
 * Pulls the first balanced JSON array out of a model response.
 *
 * `responseMimeType: 'application/json'` is a strong hint, not a guarantee: the
 * model occasionally appends prose or a second document, and `JSON.parse` then
 * throws on the whole payload. That failure silently downgraded an entire batch
 * of 12 tracks to heuristics, so the array is extracted explicitly instead.
 */
export function extractJsonArray(raw: string): string | null {
  const text = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('[');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Accepts a BPM only if it is musically plausible. */
export function normalizeBpm(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  const rounded = Math.round(raw);
  if (rounded < 40 || rounded > 250) return undefined;
  return rounded;
}

/**
 * Accepts an intensity only if it is in [0, 1].
 *
 * The model sometimes answers on a 0-10 scale ("intensity_score": 8). Stored
 * unchecked, that made a mid-energy track read as maximum energy once clamped,
 * which corrupts every sequencing decision. An out-of-range value is rejected so
 * the caller falls back to heuristics instead.
 */
export function normalizeIntensity(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  if (raw < 0 || raw > 1) return undefined;
  return Number(raw.toFixed(2));
}

/** Accepts a valence only if it is a real number in [0, 1]. */
export function normalizeValence(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  if (raw < 0 || raw > 1) return undefined;
  return Number(raw.toFixed(2));
}

/**
 * Accepts a Camelot key only if it is well-formed ("1A".."12B").
 * Anything else becomes undefined rather than a plausible-looking guess.
 */
export function normalizeCamelotKey(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const match = raw.trim().toUpperCase().match(/^(\d{1,2})([AB])$/);
  if (!match) return undefined;
  const num = parseInt(match[1], 10);
  if (num < 1 || num > 12) return undefined;
  return `${num}${match[2]}`;
}

export async function analyzeBatchTrackMetadata(
  batch: BatchTrackItem[]
): Promise<Map<number, AIAnalysisResult>> {
  const resultMap = new Map<number, AIAnalysisResult>();
  if (batch.length === 0) return resultMap;

  const payload = batch.map((item) => ({
    index: item.index,
    title: item.title,
    artist: item.artist,
    tags: item.tags || [],
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [{ text: BATCH_DRIFT_PROMPT + '\n\nInput Tracks Array:\n' + JSON.stringify(payload) }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const arrayText = response.text ? extractJsonArray(response.text) : null;
    if (arrayText) {
      const parsed = JSON.parse(arrayText) as BatchAIAnalysisResult[];
      if (Array.isArray(parsed)) {
        let rejected = 0;
        for (const res of parsed) {
          if (!res || typeof res.index !== 'number') continue;

          const bpm = normalizeBpm(res.estimated_bpm);
          const intensity = normalizeIntensity(res.intensity_score);

          // Without a trustworthy BPM and intensity there is nothing to
          // sequence on; leaving the index unset makes the caller use its
          // heuristic rather than a corrupt value.
          if (bpm === undefined || intensity === undefined) {
            rejected++;
            continue;
          }

          resultMap.set(res.index, {
            estimated_bpm: bpm,
            intensity_score: intensity,
            vibe_review: res.vibe_review || 'Vibe analyzed by Gemini AI.',
            valence: normalizeValence(res.valence),
            camelot_key: normalizeCamelotKey(res.camelot_key),
          });
        }
        if (rejected > 0) {
          console.warn(
            `[AIService] Discarded ${rejected}/${parsed.length} analyses with out-of-range BPM or intensity; those tracks fall back to heuristics.`
          );
        }
      }
    } else if (response.text) {
      console.warn('[AIService] Could not locate a JSON array in the Gemini response.');
    }
  } catch (error: any) {
    const isQuotaError =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuotaError) {
      console.warn(`[AIService] Gemini API Rate Limit Exceeded (429 / Quota Exhausted). Falling back to heuristic track analysis for ${batch.length} tracks.`);
    } else {
      console.error('[AIService] Error during batch track analysis with Gemini:', error?.message || error);
    }
  }

  return resultMap;
}

export async function getRecommendedTracks(
  seedTracks: Array<{ title: string; artist: string; estimatedBpm?: number; intensityScore?: number }>
): Promise<RecommendedTrackProposal[]> {
  const seedStr = seedTracks
    .map((t, idx) => `${idx + 1}. "${t.title}" by ${t.artist} (BPM: ${t.estimatedBpm || 120}, Intensity: ${t.intensityScore || 0.5})`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [{ text: RECOMMENDATION_PROMPT + '\n\nCurrent Playlist Seed Tracks:\n' + seedStr }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text) as RecommendedTrackProposal[];
    }
    return [];
  } catch (error) {
    console.error('Error generating track recommendations with Gemini:', error);
    return [];
  }
}
