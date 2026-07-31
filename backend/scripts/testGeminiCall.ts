import dotenv from 'dotenv';
dotenv.config();

import { analyzeTrackMetadata } from '../src/services/aiService';

async function main() {
  console.log('Testing Gemini Tier 1 Analysis...');
  console.log('API Key present:', !!process.env.GEMINI_API_KEY);
  const result = await analyzeTrackMetadata({
    title: 'Opus',
    artist: 'Eric Prydz',
    tags: ['progressive house', 'electronic'],
  });
  console.log('Result:', result);
}

main();
