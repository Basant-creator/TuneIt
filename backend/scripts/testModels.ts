import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testModel(modelName: string) {
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: 'Return JSON: {"test": 1}' }] }],
      config: { responseMimeType: 'application/json' }
    });
    console.log(`Model ${modelName} SUCCESS:`, res.text);
  } catch (e: any) {
    console.error(`Model ${modelName} FAILED:`, e.message);
  }
}

async function run() {
  await testModel('gemini-2.5-flash');
  await testModel('gemini-2.0-flash');
  await testModel('gemini-1.5-flash');
}

run();
