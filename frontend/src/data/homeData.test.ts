import { describe, expect, it } from 'vitest';
import { chaoticTracks, optimizedTracks, flowModes } from './homeData';
import { smoothnessScore } from '@/utils/smoothness';

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
