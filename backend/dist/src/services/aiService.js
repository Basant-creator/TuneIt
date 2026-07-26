"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTrackMetadata = analyzeTrackMetadata;
exports.getRecommendedTracks = getRecommendedTracks;
const genai_1 = require("@google/genai");
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
async function analyzeTrackMetadata(metadata) {
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
            return JSON.parse(text);
        }
        return null;
    }
    catch (error) {
        console.error('Error analyzing track metadata with Gemini:', error);
        return null;
    }
}
async function getRecommendedTracks(seedTracks) {
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
            return JSON.parse(text);
        }
        return [];
    }
    catch (error) {
        console.error('Error generating track recommendations with Gemini:', error);
        return [];
    }
}
