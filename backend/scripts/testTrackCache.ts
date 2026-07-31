import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/db';
import { getOrAnalyzeTrack } from '../src/services/trackCacheService';

async function testCaching() {
  console.log('================================================================');
  console.log('Testing Song Title & Artist Name Caching Integration');
  console.log('================================================================\n');

  const testSong = {
    title: 'Opus',
    artist: 'Eric Prydz',
    tags: ['progressive house'],
  };

  // 1st Fetch: "video_id_alpha"
  console.log('--> Step 1: Fetching song first time (videoId: "video_id_alpha")...');
  const start1 = Date.now();
  const res1 = await getOrAnalyzeTrack({
    title: testSong.title,
    artist: testSong.artist,
    tags: testSong.tags,
    videoId: 'video_id_alpha',
  });
  const time1 = Date.now() - start1;
  console.log(`Step 1 Result (${time1}ms):`, res1);

  console.log('\n----------------------------------------------------------------\n');

  // 2nd Fetch: SAME song (Title + Artist), DIFFERENT videoId "video_id_beta"
  console.log('--> Step 2: Fetching SAME song with DIFFERENT videoId ("video_id_beta")...');
  const start2 = Date.now();
  const res2 = await getOrAnalyzeTrack({
    title: testSong.title,
    artist: testSong.artist,
    tags: testSong.tags,
    videoId: 'video_id_beta',
  });
  const time2 = Date.now() - start2;
  console.log(`Step 2 Result (${time2}ms):`, res2);

  console.log('\n================================================================');
  if (res1.estimatedBpm === res2.estimatedBpm && res1.intensityScore === res2.intensityScore) {
    console.log('✅ SUCCESS! Cache Hit verified on Title + Artist match across different videoIds!');
    console.log(`Initial analysis took ${time1}ms | Cache hit returned in ${time2}ms.`);
  } else {
    console.log(`❌ Result: time1=${time1}ms, time2=${time2}ms, BPM1=${res1.estimatedBpm}, BPM2=${res2.estimatedBpm}`);
  }
  console.log('================================================================\n');

  await prisma.$disconnect();
}

testCaching().catch(console.error);
