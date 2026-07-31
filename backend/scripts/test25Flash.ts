import dotenv from 'dotenv';
dotenv.config();

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

Do not include markdown code block formatting.`;

async function main() {
  console.log('Testing 8 rapid calls with gemini-2.5-flash...');
  for (let i = 0; i < 8; i++) {
    const start = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: DRIFT_PROMPT + '\n\nInput Payload:\nTitle: "Opus"\nChannel: "Eric Prydz"\nTags: ["progressive house"]' }] }],
      config: { responseMimeType: 'application/json' }
    });
    console.log(`Call ${i + 1} (${Date.now() - start}ms):`, response.text);
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
