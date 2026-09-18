import { decodeHtmlEntities } from './decodeHtml';
import {
  cleanArtistName,
  cleanTrackTitle,
  scoreMatch,
  stripFeatures,
} from './trackNaming';

/**
 * Resolves a 30-second preview from the iTunes Search API.
 *
 * The previous implementation searched with the raw YouTube strings — a title
 * still containing the words "Official Video" and an artist still reading
 * "The Weeknd - Topic" — and then accepted `results[0]` without checking it.
 * When that returned nothing it retried on the title alone, which is how
 * "How Long" by Charlie Puth ended up previewing a 1976 track by Ace.
 *
 * Every candidate is now scored against the track we actually asked for, and a
 * result below the confidence floor is rejected. No preview is a better answer
 * than the wrong song.
 */

export interface PreviewMatch {
  previewUrl: string;
  /** Title as the catalogue spells it — shown so the user can judge the match. */
  matchedTitle: string;
  matchedArtist: string;
  artworkUrl?: string;
  /** Match confidence in [0, 1]. */
  confidence: number;
  /** True when the match is good but not exact, e.g. a different release. */
  approximate: boolean;
}

/** Below this, a candidate is treated as the wrong song. */
const MIN_CONFIDENCE = 0.55;
/** At or above this, the match is presented without qualification. */
const STRONG_CONFIDENCE = 0.8;

interface ITunesResult {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
}

async function searchItunes(term: string, limit = 8): Promise<ITunesResult[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data?.results) ? (data.results as ITunesResult[]) : [];
}

/** Picks the best-scoring candidate that clears the confidence floor. */
function pickBest(
  results: ITunesResult[],
  wantTitle: string,
  wantArtist: string
): PreviewMatch | null {
  let best: PreviewMatch | null = null;

  for (const result of results) {
    if (!result.previewUrl || !result.trackName) continue;

    const score = scoreMatch(
      wantTitle,
      wantArtist,
      result.trackName,
      result.artistName ?? ''
    );

    // A confident title plus a plainly different artist is the classic
    // wrong-song case, so require some artist agreement unless we were given
    // no artist to compare against.
    if (wantArtist && score.artistScore < 0.34) continue;
    if (score.overall < MIN_CONFIDENCE) continue;

    if (!best || score.overall > best.confidence) {
      best = {
        previewUrl: result.previewUrl,
        matchedTitle: result.trackName,
        matchedArtist: result.artistName ?? 'Unknown Artist',
        artworkUrl: result.artworkUrl100,
        confidence: score.overall,
        approximate: score.overall < STRONG_CONFIDENCE,
      };
    }
  }

  return best;
}

/**
 * Finds a verified preview for a track, or null when none can be trusted.
 */
export async function findAudioPreview(
  rawTitle: string,
  rawArtist: string
): Promise<PreviewMatch | null> {
  const title = cleanTrackTitle(decodeHtmlEntities(rawTitle));
  const artist = cleanArtistName(decodeHtmlEntities(rawArtist));

  // Ordered by how much signal each query carries. The first strong match wins;
  // otherwise the best acceptable match across all strategies is used.
  const strategies = [
    `${title} ${artist}`,
    `${stripFeatures(title)} ${artist}`,
    // Primary artist only, for "A, B & C" style credits.
    `${stripFeatures(title)} ${artist.split(/[,&]|\sfeat\.?\s|\sx\s/i)[0].trim()}`,
    // Title alone, still scored against the artist we wanted.
    stripFeatures(title),
  ].filter((term, idx, all) => term.trim().length > 0 && all.indexOf(term) === idx);

  let best: PreviewMatch | null = null;

  for (const term of strategies) {
    let results: ITunesResult[];
    try {
      results = await searchItunes(term);
    } catch {
      continue;
    }

    const candidate = pickBest(results, title, artist);
    if (candidate && (!best || candidate.confidence > best.confidence)) {
      best = candidate;
    }
    if (best && !best.approximate) break;
  }

  return best;
}

/**
 * Backwards-compatible wrapper returning just the URL.
 *
 * @deprecated Prefer `findAudioPreview`, which reports what was matched so the
 * UI can show it and flag an approximate match.
 */
export async function getAudioPreviewUrl(
  title: string,
  artist: string
): Promise<string | null> {
  const match = await findAudioPreview(title, artist);
  return match?.previewUrl ?? null;
}
