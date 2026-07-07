"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTrackMetadata = analyzeTrackMetadata;
const genai_1 = require("@google/genai");
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const DRIFT_PROMPT = `
You are a music analytics engine. Analyze the provided YouTube music title and tags. 
Estimate the BPM and evaluate the "Sonic Intensity" score.
Intensity scale guidelines:
- 0.0 to 0.3: Ambient, dreamy, smooth synth pads, floating (e.g., Resonance by HOME).
- 0.4 to 0.6: Mid-intensity, steady low-key drums, lo-fi groove, slowed-down chill beats.
- 0.7 to 1.0: Aggressive, harsh distortion, heavy bass cowbells, loud phonk, frantic percussion.

Return strictly a raw JSON object with keys "estimated_bpm" (integer) and "intensity_score" (float).
`;
async function analyzeTrackMetadata(metadata) {
    const inputStr = `Title: "${metadata.title}", Artist: "${metadata.artist}", Tags: ${JSON.stringify(metadata.tags)}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: [
                { role: 'user', parts: [{ text: DRIFT_PROMPT + '\n\nInput Payload:\n' + inputStr }] }
            ],
            config: {
                responseMimeType: "application/json",
            }
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
