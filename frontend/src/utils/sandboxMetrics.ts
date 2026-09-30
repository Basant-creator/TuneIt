/**
 * Sandbox metrics (src/utils/sandboxMetrics.ts)
 *
 * Presents a real engine run (sandboxEngineResults.json) on a mode card.
 * Nothing is scored here: the backend generator runs the engine, then judges
 * its order and all 120 shuffles of the same five picks with the engines' own
 * functions. This file only names and phrases those numbers.
 *
 * Each card shows:
 * - checks: one per promise on the mode card, pass or fail, with how often a
 *   random order of the same picks would pass too. A check a shuffle passes
 *   90% of the time proves little, and the card says so.
 * - bars: measurements that genuinely vary, next to their shuffled average.
 *
 * An earlier version showed four percentage bars and their average as "Match".
 * Nine of the sixteen bars could not come out below 100 (they measured the
 * rule the engine sorts by), and the easy preset data flattered the rest.
 */

import results from '../data/sandboxEngineResults.json';
import { PRESET_TRACKS, type Track } from '../data/presetTracks';

export type SandboxMode = 'bu' | 'df' | 'ph' | 'cm';

export interface EngineRun {
  order: Array<{ id: string; seg: string | null; dE: number }>;
  excluded: Array<{ id: string; reason: string }>;
  kept: number;
  total: number;
  smoothness: number;
  engine: Record<string, number | string>;
  /** [passes on the engine's order, % of shuffles passing]; null = not applicable. */
  checks: Record<string, [boolean | null, number | null]>;
  /** [value on the engine's order, shuffled mean], both 0-100; null = nothing to measure. */
  bars: Record<string, [number | null, number | null]>;
}

export interface Check {
  id: string;
  name: string;
  pass: boolean | null;
  /** % of the 120 orders of the same picks that also pass. */
  shuffled: number | null;
  hint: string;
}

export interface Bar {
  id: string;
  name: string;
  value: number | null;
  /** Mean over the 120 orders of the same picks. */
  shuffled: number | null;
  hint: string;
}

export interface SandboxScore {
  run: EngineRun;
  tracks: Track[];
  excludedTracks: Array<{ track: Track; reason: string }>;
  checks: Check[];
  bars: Bar[];
  /** Checks passed, out of the checks that apply. */
  passed: number;
  applicable: number;
  summary: string;
  /** How the engine's order compares with a random one, in a sentence. */
  comparison: string;
}

const RUNS = (results as unknown as { results: Record<string, EngineRun> }).results;
const BY_ID = new Map(PRESET_TRACKS.map((t) => [t.id, t]));

const SHUFFLE_NOTE = 'Shuffled = the same five picks in every possible order (all 120).';

type Label = { name: string; hint: string };

const CHECKS: Record<SandboxMode, Record<string, Label>> = {
  bu: {
    'opens-calm': { name: 'Opens with the calmest track', hint: 'The first track is the lowest-energy one kept.' },
    'no-jarring': { name: 'No jump over 0.35', hint: 'No transition changes energy by more than 0.35, the jarring threshold every engine uses.' },
    'ends-loudest': { name: 'Loudest track lands last', hint: 'The final track is the highest-energy one kept.' },
  },
  df: {
    'in-zone': { name: 'Everything kept is in the zone', hint: "Every track left in sits inside Drift's tempo and energy gate. Shuffled: how often all five picks would." },
    'no-jarring': { name: 'No jump over 0.35', hint: 'No transition changes energy by more than 0.35.' },
  },
  ph: {
    swing: { name: 'Throws a big swing', hint: 'At least one energy jump of 0.35 or more.' },
    anchored: { name: 'Every swing is anchored', hint: "Every jump of 0.35 or more lands on a compatible key or a synced tempo, by the engine's own anchor rule." },
    recovers: { name: 'Recovers after a swing', hint: 'The step after each swing is smaller than 0.35.' },
  },
  cm: {
    'opens-usual': { name: 'Act I at usual energy', hint: "Every Act I track is within 0.10 of the playlist's average energy." },
    turns: { name: 'Act II holds the turn', hint: "The highest-energy track (or lowest, for a valley arc) sits in Act II." },
    resolves: { name: 'Act III resolves', hint: 'The last track ends closer to the average energy than the Act II turn.' },
  },
};

const BARS: Record<SandboxMode, Record<string, Label>> = {
  bu: {
    smoothness: { name: 'Smoothness', hint: '100 minus the average energy change between tracks.' },
    gentle: { name: 'Gentle steps', hint: 'Share of transitions that move energy by 0.15 or less.' },
  },
  df: {
    smoothness: { name: 'Energy steadiness', hint: "100 minus the average energy change between tracks. Shuffled uses all five picks: what you'd get without Drift." },
    tempo: { name: 'Tempo steadiness', hint: "Average tempo change on Drift's own scale, where 30 BPM is a full step. Shuffled uses all five picks." },
  },
  ph: {
    'swing-size': { name: 'Anchored swing size', hint: "The biggest anchored jump, against the engine's 0.45 target." },
    calm: { name: 'Calm between swings', hint: '100 minus the average energy change of the transitions that are not swings.' },
  },
  cm: {
    smoothness: { name: 'Smoothness', hint: '100 minus the average energy change between tracks.' },
    gentle: { name: 'Gentle steps', hint: 'Share of transitions that move energy by 0.15 or less.' },
  },
};

/** Canonical lookup key: the selection's ids in preset order. */
export function selectionKey(ids: string[]): string {
  const order = new Map(PRESET_TRACKS.map((t, i) => [t.id, i]));
  return [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)).join(',');
}

export function getEngineRun(ids: string[]): EngineRun | null {
  return RUNS[selectionKey(ids)] ?? null;
}

function modeSummary(mode: SandboxMode, run: EngineRun, tracks: Track[]): string {
  const e = tracks.map((t) => t.energy);
  const range = e.length ? Math.max(...e) - Math.min(...e) : 0;
  const em = run.engine;

  if (mode === 'bu') {
    const net = e[e.length - 1] - e[0];
    return net >= 0
      ? `Climbs from ${e[0].toFixed(2)} to ${e[e.length - 1].toFixed(2)} energy.`
      : `Goes from ${e[0].toFixed(2)} to ${e[e.length - 1].toFixed(2)} energy, ending below where it started.`;
  }
  if (mode === 'df') {
    return run.kept < run.total
      ? `Drift kept ${run.kept} of ${run.total} and set aside ${run.total - run.kept}; what's left spans ${range.toFixed(2)} in energy.`
      : `All ${run.total} fit Drift's zone, spanning ${range.toFixed(2)} in energy.`;
  }
  if (mode === 'cm') {
    const spike = em.actDirection !== 'TANK_AND_SPIKE';
    return `The engine chose a ${spike ? 'climax' : 'valley'} arc around an average energy of ${Number(em.baselineIntensity).toFixed(2)}.`;
  }
  const cb = run.order.findIndex((o) => o.seg === 'CURVEBALL');
  if (Number(em.totalCurveballs) > 0 && cb > 0) {
    return `Curveball on track ${cb + 1}: ${tracks[cb - 1].name} to ${tracks[cb].name}, a ${Math.abs(run.order[cb].dE).toFixed(2)} energy jump.`;
  }
  return range < 0.35
    ? `These tracks sit within ${range.toFixed(2)} of each other — nothing to throw between.`
    : 'The range is there, but the engine found no anchored swing to throw.';
}

function compare(bars: Bar[]): string {
  const measured = bars.filter((b) => b.value !== null && b.shuffled !== null);
  if (measured.length === 0) return '';
  const better = measured.filter((b) => b.value! > b.shuffled!).length;
  if (better === measured.length) return `Beats a random order on ${measured.length === 2 ? 'both measures' : 'every measure'}.`;
  if (better === 0) return 'No better than a random order on these measures.';
  return `Beats a random order on ${better} of ${measured.length} measures.`;
}

export function scoreSelection(mode: SandboxMode, ids: string[]): SandboxScore | null {
  if (ids.length !== 5) return null;
  const run = getEngineRun(ids);
  if (!run) return null;

  const tracks = run.order.map((o) => BY_ID.get(o.id)!);
  const excludedTracks = run.excluded.map((x) => ({ track: BY_ID.get(x.id)!, reason: x.reason }));
  const valley = mode === 'cm' && run.engine.actDirection === 'TANK_AND_SPIKE';

  const checks: Check[] = Object.entries(CHECKS[mode]).map(([id, label]) => {
    const [pass, shuffled] = run.checks[id] ?? [null, null];
    const name = id === 'turns' ? (valley ? 'Act II holds the valley' : 'Act II holds the peak') : label.name;
    return { id, name, pass, shuffled, hint: `${label.hint} ${SHUFFLE_NOTE}` };
  });
  const bars: Bar[] = Object.entries(BARS[mode]).map(([id, label]) => {
    const [value, shuffled] = run.bars[id] ?? [null, null];
    return { id, name: label.name, value, shuffled, hint: `${label.hint} ${SHUFFLE_NOTE}` };
  });

  const applicable = checks.filter((c) => c.pass !== null);
  return {
    run,
    tracks,
    excludedTracks,
    checks,
    bars,
    passed: applicable.filter((c) => c.pass).length,
    applicable: applicable.length,
    summary: modeSummary(mode, run, tracks),
    comparison: compare(bars),
  };
}

/** How much better than a shuffle the engine's order is, averaged over the bars. */
export function gainOverShuffle(run: EngineRun): number {
  const b = Object.values(run.bars).filter(([v, s]) => v !== null && s !== null) as Array<[number, number]>;
  return b.length ? b.reduce((a, [v, s]) => a + (v - s), 0) / b.length : 0;
}

function passRate(run: EngineRun): number {
  const c = Object.values(run.checks).filter(([p]) => p !== null);
  return c.length ? c.filter(([p]) => p).length / c.length : 0;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/**
 * The selection a mode card opens on: a typical one, not the best one. It is
 * the selection at the median share of checks passed whose gain over a shuffle
 * is closest to the median gain. The previous defaults were hand-picked best
 * cases (Drift's was its top-scoring selection of 56), so every card opened
 * looking perfect.
 */
export function typicalSelection(mode: SandboxMode): string[] {
  const ids = new Set(PRESET_TRACKS.filter((t) => t.category === mode).map((t) => t.id));
  const runs = Object.entries(RUNS).filter(([key]) => key.split(',').every((id) => ids.has(id)));
  const midRate = median(runs.map(([, r]) => passRate(r)));
  const midGain = median(runs.map(([, r]) => gainOverShuffle(r)));
  const [key] = runs
    .filter(([, r]) => passRate(r) === midRate)
    .reduce((best, cur) =>
      Math.abs(gainOverShuffle(cur[1]) - midGain) < Math.abs(gainOverShuffle(best[1]) - midGain) ? cur : best
    );
  return key.split(',');
}

/** Human label for an engine segment. */
export function segmentLabel(seg: string | null): string | null {
  if (!seg) return null;
  return (
    {
      ENTRY: 'Entry',
      ACT_I: 'Act I',
      ACT_II: 'Act II',
      ACT_III: 'Act III',
      PEAK: 'Peak',
      SETUP: 'Setup',
      CURVEBALL: 'Curveball',
      RECOVERY: 'Recovery',
    } as Record<string, string>
  )[seg] ?? seg.replace(/_/g, ' ');
}
