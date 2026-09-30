import presetData from './presetTracks.json';

/**
 * A track in the landing-page sandbox.
 *
 * bpm, energy, valence and key are measured by TuneIt's own analyzer (see
 * presetTracks.json), not typed by hand. The hand-typed values were often far
 * off: Innerbloom, a slow nine-minute track, was entered at energy 0.84 and
 * measures 0.25; the whole Unhinged set was squashed into 0.65-0.88, so no
 * curveball was possible.
 */
export interface Track {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  /** Camelot key, e.g. "8A"; null when the analyzer declined to guess. */
  key: string | null;
  energy: number;
  /** Musical positivity 0.0-1.0; null when unknown. */
  valence: number | null;
  coverUrl: string;
  category: 'bu' | 'df' | 'ph' | 'cm';
  role: string;
  /** Where the measurement came from: the track cache, or a fresh analysis. */
  source: 'cache' | 'gemini';
  /** Added to give the engine something hard: too quiet, too loud, wrong tempo. */
  awkward?: boolean;
}

export const PRESET_TRACKS: Track[] = presetData.tracks as Track[];
