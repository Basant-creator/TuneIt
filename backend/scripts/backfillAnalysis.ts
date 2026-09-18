/**
 * Backfill valence and Camelot key (scripts/backfillAnalysis.ts)
 *
 * Tracks analysed before those fields existed are cached with nulls, and a cache
 * hit never re-analyses — so without this, harmonic anchoring and valence
 * contrast would stay permanently off for an existing library.
 *
 * This is opt-in because it spends Gemini quota: one request per batch of 12
 * tracks, throttled to the same 14/min reservoir the live path uses.
 *
 *   npm run backfill:analysis            # dry run, shows what would change
 *   npm run backfill:analysis -- --apply # write to the database
 *   npm run backfill:analysis -- --apply --limit 60
 */

import prisma from '../src/config/db';
import { analyzeBatchTrackMetadata, BatchTrackItem } from '../src/services/aiService';
import Bottleneck from 'bottleneck';

const BATCH_SIZE = 12;

// Matches trackCacheService: 14 requests per minute, one at a time.
const limiter = new Bottleneck({
  reservoir: 14,
  reservoirRefreshAmount: 14,
  reservoirRefreshInterval: 60_000,
  maxConcurrent: 1,
  minTime: 1000,
});

function parseArgs() {
  const args = process.argv.slice(2);
  const limitFlag = args.indexOf('--limit');
  return {
    apply: args.includes('--apply'),
    limit: limitFlag >= 0 ? parseInt(args[limitFlag + 1], 10) || undefined : undefined,
  };
}

async function main() {
  const { apply, limit } = parseArgs();

  const pending = await prisma.youtubeTrack.findMany({
    where: { OR: [{ camelotKey: null }, { valence: null }] },
    orderBy: { lastUpdated: 'asc' },
    ...(limit ? { take: limit } : {}),
  });

  const total = await prisma.youtubeTrack.count();
  console.log(`Cached tracks: ${total}`);
  console.log(`Missing valence or key: ${pending.length}${limit ? ` (limited to ${limit})` : ''}`);

  if (pending.length === 0) {
    console.log('Nothing to backfill.');
    await prisma.$disconnect();
    return;
  }

  const batches = Math.ceil(pending.length / BATCH_SIZE);
  console.log(`Would issue ${batches} Gemini request(s) at ${BATCH_SIZE} tracks each.`);

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write changes.');
    console.log('Sample of what would be re-analysed:');
    pending.slice(0, 5).forEach((t) => console.log(`  - ${t.artist} — ${t.title}`));
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let keyed = 0;
  let valenced = 0;
  let skipped = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    const payload: BatchTrackItem[] = chunk.map((t, idx) => ({
      index: idx,
      title: t.title,
      artist: t.artist,
      tags: [],
    }));

    process.stdout.write(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${batches}... `);

    let results;
    try {
      results = await limiter.schedule(() => analyzeBatchTrackMetadata(payload));
    } catch (err: any) {
      console.log(`failed (${err?.message || err}) — skipping`);
      skipped += chunk.length;
      continue;
    }

    let batchUpdated = 0;
    for (let idx = 0; idx < chunk.length; idx++) {
      const res = results.get(idx);
      // Only write fields the analyser actually produced. A null stays null
      // rather than being overwritten with a fabricated value.
      const data: { valence?: number; camelotKey?: string } = {};
      if (res?.valence !== undefined) data.valence = res.valence;
      if (res?.camelot_key !== undefined) data.camelotKey = res.camelot_key;

      if (Object.keys(data).length === 0) {
        skipped++;
        continue;
      }

      try {
        await prisma.youtubeTrack.update({ where: { trackKey: chunk[idx].trackKey }, data });
        batchUpdated++;
        if (data.camelotKey) keyed++;
        if (data.valence !== undefined) valenced++;
      } catch (err: any) {
        console.error(`\n  update failed for "${chunk[idx].title}": ${err?.message}`);
        skipped++;
      }
    }
    updated += batchUpdated;
    console.log(`${batchUpdated}/${chunk.length} updated`);
  }

  console.log('\nDone.');
  console.log(`  rows updated:      ${updated}`);
  console.log(`  gained a key:      ${keyed}`);
  console.log(`  gained a valence:  ${valenced}`);
  console.log(`  left unchanged:    ${skipped}  (analyser had no confident answer)`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
