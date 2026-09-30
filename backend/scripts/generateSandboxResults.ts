/**
 * Sandbox results generator (scripts/generateSandboxResults.ts)
 *
 * The landing-page sandbox lets a visitor pick 5 of 10 preset tracks per mode.
 * Rather than re-implement each engine in the browser — which drifted: the
 * browser Rise sorted by tempo and the browser Frame built neither of Frame's
 * arcs — this runs the real engines over every possible selection and writes
 * their output for the sandbox to display.
 *
 *   4 modes x C(10,5) = 1,008 engine runs, over the same measured preset data.
 *
 *   npm run generate:sandbox          # rewrite the results file
 *   npm run generate:sandbox -- --check  # fail if it is stale (used in verify)
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { runFlowEngine, FlowMode, EnrichedTrack } from '../src/services/flowEngineService';
import { computeFlowMetrics } from '../src/utils/flowMetrics';
import { checkAnchor, normalizeTrack } from '../src/utils/unhingedAlgorithm';
import { resolveDriftGate, DriftGate } from '../src/utils/driftAlgorithm';

const FRONTEND_DATA = path.resolve(__dirname, '../../frontend/src/data');
const PRESETS = path.join(FRONTEND_DATA, 'presetTracks.json');
const OUTPUT = path.join(FRONTEND_DATA, 'sandboxEngineResults.json');
const MODES: FlowMode[] = ['bu', 'df', 'ph', 'cm'];

interface Preset {
  id: string;
  name: string;
  artist: string;
  category: FlowMode;
  bpm: number;
  energy: number;
  valence: number | null;
  key: string | null;
}

const round = (n: number, d = 4) => Number(n.toFixed(d));

function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const pick = (from: number, chosen: T[]) => {
    if (chosen.length === k) return void out.push(chosen);
    for (let i = from; i < items.length; i++) pick(i + 1, [...chosen, items[i]]);
  };
  pick(0, []);
  return out;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((r) => [x, ...r]));
}

// ---------------------------------------------------------------------------
// Judging an order
//
// Each mode card makes three promises (homeData.ts `features`). Every check
// below tests one of them, and every bar measures something that genuinely
// varies between selections. Both are scored twice: on the engine's order, and
// on the visitor's five picks in every one of their 120 possible orders — the
// "shuffled" baseline. A check the engine passes but a shuffle usually passes
// too is not worth much, and the card now says so.
//
// Everything uses the engines' own functions (computeFlowMetrics, checkAnchor,
// resolveDriftGate), so the baseline is judged by exactly the same rules.
// ---------------------------------------------------------------------------

/** The engines' jarring threshold, and Unhinged's smallest allowed curveball. */
const BIG_JUMP = 0.35;
/** Unhinged's first-choice curveball size. */
const CURVEBALL_TARGET = 0.45;
const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

type Judged = { checks: Record<string, boolean | null>; bars: Record<string, number | null> };

interface FrameShape {
  act1: number;
  act3: number;
  spike: boolean;
  baseline: number;
}

function steps(order: EnrichedTrack[]): number[] {
  return order.slice(1).map((t, i) => t.intensityScore - order[i].intensityScore);
}

function common(order: EnrichedTrack[]) {
  const fm = computeFlowMetrics(order);
  const d = steps(order);
  return {
    fm,
    d,
    smoothness: clamp100(fm.smoothnessScore),
    gentle: d.length ? clamp100((100 * d.filter((x) => Math.abs(x) <= 0.15).length) / d.length) : null,
    tempo: d.length ? clamp100(100 - (fm.meanBpmDelta / 30) * 100) : null,
  };
}

const asUnhinged = (t: EnrichedTrack) =>
  normalizeTrack({ id: t.videoId, title: t.title, artist: t.artist, bpm: t.estimatedBpm, arousal: t.intensityScore, valence: t.valence, key: t.camelotKey });

interface JudgeContext {
  frame?: FrameShape;
  gate?: DriftGate;
}

function judge(mode: FlowMode, order: EnrichedTrack[], ctx: JudgeContext): Judged {
  const { fm, d, smoothness, gentle, tempo } = common(order);
  const e = order.map((t) => t.intensityScore);
  const eps = 1e-9;

  if (mode === 'bu') {
    return {
      checks: {
        'opens-calm': e[0] <= Math.min(...e) + eps,
        'no-jarring': fm.jarringCount === 0,
        'ends-loudest': e[e.length - 1] >= Math.max(...e) - eps,
      },
      bars: { smoothness, gentle },
    };
  }

  if (mode === 'df') {
    return {
      checks: {
        // Inside Drift's own gate for these picks (resolveDriftGate).
        'in-zone': order.every(
          (t) => t.intensityScore <= ctx.gate!.maxIntensity && t.estimatedBpm >= ctx.gate!.lowerBpm && t.estimatedBpm <= ctx.gate!.upperBpm
        ),
        'no-jarring': fm.jarringCount === 0,
      },
      bars: { smoothness, tempo },
    };
  }

  if (mode === 'ph') {
    // A swing is any jump of 0.35 or more, on the engine's order and on a
    // shuffle alike. So a big drop the engine did not mean as a curveball
    // still has to be anchored, and still counts against "recovers".
    const swings = d.map((x, i) => (Math.abs(x) >= BIG_JUMP ? i : -1)).filter((i) => i >= 0);
    const anchoredAt = (i: number) => checkAnchor(asUnhinged(order[i]), asUnhinged(order[i + 1])).isAnchored;
    const anchoredSwings = swings.filter(anchoredAt);
    const notLast = swings.filter((i) => i < d.length - 1);
    const calmSteps = d.filter((_, i) => !swings.includes(i));
    return {
      checks: {
        swing: swings.length > 0,
        anchored: swings.length === 0 ? null : anchoredSwings.length === swings.length,
        recovers: notLast.length === 0 ? null : notLast.every((i) => Math.abs(d[i + 1]) < BIG_JUMP),
      },
      bars: {
        'swing-size': clamp100(
          (Math.max(0, ...anchoredSwings.map((i) => Math.abs(d[i]))) / CURVEBALL_TARGET) * 100
        ),
        calm: calmSteps.length
          ? clamp100(100 - (calmSteps.reduce((a, x) => a + Math.abs(x), 0) / calmSteps.length) * 100)
          : null,
      },
    };
  }

  // Frame: the acts are the slots the engine used; on a shuffle, Act II
  // absorbs any tracks the engine set aside.
  const f = ctx.frame!;
  const act2End = e.length - f.act3;
  const act1 = e.slice(0, f.act1);
  const act2 = e.slice(f.act1, act2End);
  const extreme = f.spike ? Math.max(...e) : Math.min(...e);
  const turn = act2.length ? (f.spike ? Math.max(...act2) : Math.min(...act2)) : null;
  const last = e[e.length - 1];
  return {
    checks: {
      'opens-usual': act1.every((x) => Math.abs(x - f.baseline) <= 0.1 + eps),
      turns: turn !== null && Math.abs(turn - extreme) < eps,
      resolves: turn === null || f.act3 === 0 ? null : Math.abs(last - f.baseline) < Math.abs(turn - f.baseline),
    },
    bars: { smoothness, gentle },
  };
}

/**
 * Over all 120 orders of the five picks: the share passing each check (%, of
 * the orders where it applies), and each bar's mean. Exact, not sampled.
 */
function shuffledBaseline(mode: FlowMode, picked: EnrichedTrack[], ctx: JudgeContext) {
  const all = permutations(picked).map((p) => judge(mode, p, ctx));
  const checks: Record<string, number | null> = {};
  const bars: Record<string, number | null> = {};
  for (const id of Object.keys(all[0].checks)) {
    const scored = all.map((j) => j.checks[id]).filter((v): v is boolean => v !== null);
    checks[id] = scored.length ? Math.round((100 * scored.filter(Boolean).length) / scored.length) : null;
  }
  for (const id of Object.keys(all[0].bars)) {
    const vals = all.map((j) => j.bars[id]).filter((v): v is number => v !== null);
    bars[id] = vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) : null;
  }
  return { checks, bars };
}

function build() {
  const presets: Preset[] = JSON.parse(readFileSync(PRESETS, 'utf8')).tracks;
  const results: Record<string, unknown> = {};

  for (const mode of MODES) {
    const pool = presets.filter((p) => p.category === mode);
    for (const combo of combinations(pool, 5)) {
      const enriched: EnrichedTrack[] = combo.map((p, i) => ({
        videoId: p.id,
        title: p.name,
        artist: p.artist,
        estimatedBpm: p.bpm,
        intensityScore: p.energy,
        valence: p.valence ?? undefined,
        camelotKey: p.key ?? undefined,
        originalIndex: i,
      }));
      const r = runFlowEngine(mode, enriched);
      const em = r.engineMetrics as Record<string, any>;

      // Only what the sandbox renders, in each engine's own terms.
      const engine: Record<string, unknown> =
        mode === 'bu'
          ? { slope: em.slope, jarringCount: em.jarringCount, negativeDeltaCount: em.negativeDeltaCount }
          : mode === 'cm'
            ? { baselineIntensity: em.baselineIntensity, actDirection: em.actDirection, jarringJumps: em.jarringJumps }
            : mode === 'ph'
              ? { totalCurveballs: em.totalCurveballs, maxShockDelta: em.maxShockDelta }
              : {};

      // Judge the engine's order and the shuffled baseline by the same rules.
      const byId = new Map(enriched.map((t) => [t.videoId, t]));
      const engineOrder = r.tracks.map((t) => byId.get(t.videoId)!);
      const segs = r.tracks.map((t) => t.segment ?? null);
      const frame: FrameShape | undefined =
        mode === 'cm'
          ? {
              act1: segs.filter((s) => s === 'ACT_I').length,
              act3: segs.filter((s) => s === 'ACT_III').length,
              spike: em.actDirection !== 'TANK_AND_SPIKE',
              baseline: Number(em.baselineIntensity),
            }
          : undefined;
      const gate = mode === 'df' ? resolveDriftGate(enriched.map((t) => ({ ...t, originalIndex: t.originalIndex ?? 0 }))) : undefined;
      const mine = judge(mode, engineOrder, { frame, gate });
      const shuffled = shuffledBaseline(mode, enriched, { frame, gate });
      const checks = Object.fromEntries(Object.keys(mine.checks).map((id) => [id, [mine.checks[id], shuffled.checks[id]]]));
      const bars = Object.fromEntries(Object.keys(mine.bars).map((id) => [id, [mine.bars[id], shuffled.bars[id]]]));

      results[combo.map((p) => p.id).join(',')] = {
        order: r.tracks.map((t) => ({ id: t.videoId, seg: t.segment ?? null, dE: round(t.deltaEnergy ?? 0) })),
        excluded: r.harshTracks.map((t) => ({ id: t.videoId, reason: t.reason ?? 'Excluded by the engine' })),
        kept: r.acceptedCount,
        total: r.originalCount,
        smoothness: r.smoothnessScore,
        engine,
        // [engine's order, shuffled]: a check is [pass, % of shuffles passing],
        // a bar is [value, shuffled mean]. null = nothing to measure.
        checks,
        bars,
      };
    }
  }

  return {
    about:
      "Real engine output for every 5-track selection in the landing-page sandbox, produced by backend/scripts/generateSandboxResults.ts from presetTracks.json, with each card's checks and bars scored on the engine's order and on all 120 shuffles of the same picks. Do not edit by hand; regenerate.",
    runs: Object.keys(results).length,
    results,
  };
}

/** One run per line: small enough to ship, and still a readable diff. */
function serialize(data: ReturnType<typeof build>): string {
  const lines = Object.entries(data.results).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  return `{\n  "about": ${JSON.stringify(data.about)},\n  "runs": ${data.runs},\n  "results": {\n${lines.join(',\n')}\n  }\n}\n`;
}

const next = serialize(build());

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUTPUT, 'utf8');
  } catch {
    /* missing counts as stale */
  }
  if (current.replace(/\r\n/g, '\n') !== next) {
    console.error('❌ sandboxEngineResults.json is stale. Run: npm run generate:sandbox');
    process.exit(1);
  }
  console.log(`✅ Sandbox results match the current engines (${JSON.parse(next).runs} runs).`);
} else {
  writeFileSync(OUTPUT, next);
  console.log(`Wrote ${OUTPUT} (${JSON.parse(next).runs} engine runs)`);
}
