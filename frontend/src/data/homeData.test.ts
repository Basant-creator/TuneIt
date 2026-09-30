import { describe, expect, it } from 'vitest';
import { chaoticTracks, optimizedTracks, flowModes, DEFAULT_SANDBOX_PICKS } from './homeData';
import { smoothnessScore } from '@/utils/smoothness';
import { PRESET_TRACKS } from './presetTracks';
import { gainOverShuffle, getEngineRun, scoreSelection } from '@/utils/sandboxMetrics';

/**
 * The landing page's before/after demo is the product's first claim. It used to
 * contradict itself: the "optimized" order scored 84.0 against the "chaotic"
 * order's 85.0, and ended by dropping energy while its caption said it climbed.
 */

const energies = (tracks: Array<{ energy: number }>) => tracks.map((t) => t.energy);

describe('before/after demo integrity', () => {
  it('uses exactly the same tracks in both orders', () => {
    const ids = (t: Array<{ id: string }>) => t.map((x) => x.id).sort();
    expect(ids(optimizedTracks)).toEqual(ids(chaoticTracks));
  });

  it('makes the optimized order genuinely smoother than the chaotic one', () => {
    expect(smoothnessScore(energies(optimizedTracks))).toBeGreaterThan(
      smoothnessScore(energies(chaoticTracks))
    );
  });

  it('actually climbs, since the caption says the energy climbs', () => {
    const e = energies(optimizedTracks);
    for (let i = 1; i < e.length; i++) {
      expect(e[i]).toBeGreaterThanOrEqual(e[i - 1]);
    }
  });

  it('matches the scores the page displays', () => {
    expect(smoothnessScore(energies(chaoticTracks))).toBe(85);
    expect(smoothnessScore(energies(optimizedTracks))).toBe(89.7);
  });
});

describe('flow mode copy', () => {
  it('offers exactly the four engines the backend implements', () => {
    expect(flowModes.map((m) => m.id).sort()).toEqual(['bu', 'cm', 'df', 'ph']);
  });

  it('does not claim to choose genres, which no engine does', () => {
    // Every engine reorders the user's own tracks by tempo and energy. Earlier
    // copy described Drift as gliding "through chilled synthwave, lo-fi haze,
    // and euphoric house".
    const genreWords = /synthwave|lo-fi haze|euphoric house|indie-pop|psychedelic rock|diss tracks/i;
    for (const mode of flowModes) {
      expect(mode.description).not.toMatch(genreWords);
      mode.features.forEach((f) => expect(f).not.toMatch(genreWords));
    }
  });

  it('drops the Philosophy/Vibe/Purpose template', () => {
    for (const mode of flowModes) {
      mode.features.forEach((f) => expect(f).not.toMatch(/^(Philosophy|Vibe|Purpose):/));
    }
  });
});

describe('sandbox default picks are typical, not flattering', () => {
  // The old defaults were each mode's best case (Drift's scored 88 when its
  // median selection scored 72), so every card opened looking perfect.
  const MODES = ['bu', 'df', 'ph', 'cm'] as const;

  it('picks five real presets from the right mode', () => {
    for (const [mode, ids] of Object.entries(DEFAULT_SANDBOX_PICKS)) {
      expect(ids).toHaveLength(5);
      for (const id of ids) {
        expect(PRESET_TRACKS.find((t) => t.id === id)?.category).toBe(mode);
      }
    }
  });

  it("sits in the middle half of its mode's selections by gain over a shuffle", () => {
    for (const mode of MODES) {
      const gains = selections(mode).map((ids) => gainOverShuffle(getEngineRun(ids)!)).sort((a, b) => a - b);
      const q1 = gains[Math.floor(gains.length * 0.25)];
      const q3 = gains[Math.floor(gains.length * 0.75)];
      const mine = gainOverShuffle(getEngineRun(DEFAULT_SANDBOX_PICKS[mode])!);
      expect(mine).toBeGreaterThanOrEqual(q1);
      expect(mine).toBeLessThanOrEqual(q3);
      expect(mine).toBeLessThan(gains[gains.length - 1]);
    }
  });

  it('renders a full card for every default', () => {
    for (const mode of MODES) {
      const s = scoreSelection(mode, DEFAULT_SANDBOX_PICKS[mode])!;
      expect(s.checks.length).toBeGreaterThan(0);
      expect(s.bars).toHaveLength(2);
    }
  });
});

function selections(mode: string): string[][] {
  const ids = PRESET_TRACKS.filter((t) => t.category === mode).map((t) => t.id);
  const out: string[][] = [];
  const pick = (from: number, chosen: string[]) => {
    if (chosen.length === 5) return void out.push(chosen);
    for (let i = from; i < ids.length; i++) pick(i + 1, [...chosen, ids[i]]);
  };
  pick(0, []);
  return out;
}
