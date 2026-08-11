import { GoogleGenAI } from '@google/genai';

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
- "intensity_score" (float rounded to two decimal places)
- "vibe_review" (string, 8 to 12 words)

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

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text) as BatchAIAnalysisResult[];
      if (Array.isArray(parsed)) {
        for (const res of parsed) {
          if (res && typeof res.index === 'number') {
            resultMap.set(res.index, {
              estimated_bpm: res.estimated_bpm || 120,
              intensity_score: res.intensity_score ?? 0.5,
              vibe_review: res.vibe_review || 'Vibe analyzed by Gemini AI.',
            });
          }
        }
      }
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
