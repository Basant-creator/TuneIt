import { stripDiacritics } from './stripDiacritics';

/**
 * Track name cleaning and matching (src/utils/trackNaming.ts)
 *
 * YouTube titles and channel names are not song metadata. A title arrives as
 * "Blinding Lights (Official Video) [4K]" and the artist as "The Weeknd -
 * Topic". Searching an external catalogue with those strings verbatim either
 * returns nothing or returns the wrong song, so everything that has to match a
 * track against another service goes through here.
 */

/** Strips YouTube channel suffixes: "- Topic", "VEVO", "Official". */
export function cleanArtistName(artist: string): string {
  if (!artist) return '';
  const cleaned = artist
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*topic$/i, '')
    .replace(/\s*-\s*vevo$/i, '')
    .replace(/\s*vevo$/i, '')
    .replace(/\s*-\s*official$/i, '')
    .replace(/\s*official\s*(channel|music)?$/i, '')
    .trim();
  return cleaned || artist;
}

/**
 * Strips upload clutter from a title: "(Official Video)", "[4K]",
 * "(Lyric Video)", "- Remastered 2011", "(feat. X)" and similar.
 *
 * Bracketed content that is *not* clutter — "(Live at Wembley)",
 * "(Acoustic)" — is preserved, because it identifies a different recording.
 */
export function cleanTrackTitle(title: string): string {
  if (!title) return '';

  const clutter =
    /\s*[([{]\s*(official\s*)?(music\s*)?(video|audio|lyric[s]?(\s*video)?|visuali[sz]er|hd|4k|8k|mv|clip|full\s*song|explicit)\s*[)\]}]/gi;

  return (
    title
      .replace(clutter, '')
      // Trailing "- Official Video" / "| Official Audio" without brackets.
      .replace(/\s*[-|–]\s*(official\s*)?(music\s*)?(video|audio|lyric[s]?\s*video|visuali[sz]er)\s*$/gi, '')
      // Remaster / anniversary edition markers.
      .replace(/\s*[-–(]\s*(\d{4}\s*)?remaster(ed)?(\s*\d{4})?\s*\)?/gi, '')
      .replace(/\s*[-–]\s*\d{4}\s*(remaster|version|mix)\s*$/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s*[-–|]\s*$/, '')
      .trim() || title
  );
}

/** Drops "feat." credits, which the two catalogues spell differently. */
export function stripFeatures(title: string): string {
  return title
    .replace(/\s*[([]\s*(feat\.?|ft\.?|featuring|with)\s[^)\]]*[)\]]/gi, '')
    .replace(/\s+(feat\.?|ft\.?|featuring)\s+.*$/gi, '')
    .trim();
}

/**
 * Reduces a string to comparable tokens: lowercase, no diacritics, no
 * punctuation. "Café Déjà-Vu!" and "cafe deja vu" become the same thing.
 */
export function normalizeForMatch(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeForMatch(value).split(' ').filter(Boolean));
}

/**
 * Similarity in [0, 1] from shared tokens.
 *
 * Blends containment (measured against the smaller set, so "505" still matches
 * "505 - Live") with Jaccard (which penalises extra tokens in the candidate).
 * Containment alone scored "Blinding Lights (Remix) - The Weeknd & ROSALIA" as
 * a perfect match for "Blinding Lights", handing the user a remix instead of
 * the track they asked for. The Jaccard term lets the exact release win while
 * still accepting a decorated title when nothing cleaner exists.
 */
export function similarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared++;

  const containment = shared / Math.min(setA.size, setB.size);
  const union = setA.size + setB.size - shared;
  const jaccard = union === 0 ? 0 : shared / union;

  return Number((containment * 0.6 + jaccard * 0.4).toFixed(4));
}

/** How confidently a candidate matches the track we asked for. */
export interface MatchScore {
  titleScore: number;
  artistScore: number;
  /** Combined confidence in [0, 1], weighted toward the artist. */
  overall: number;
}

/**
 * Scores a catalogue result against the track we were looking for.
 *
 * The artist is weighted heavily on purpose. A wrong artist with the right
 * title is the exact failure users notice — searching "How Long" alone returns
 * a 1976 reggae track by Ace rather than the Charlie Puth song.
 */
export function scoreMatch(
  wantTitle: string,
  wantArtist: string,
  gotTitle: string,
  gotArtist: string
): MatchScore {
  const titleScore = Math.max(
    similarity(wantTitle, gotTitle),
    similarity(stripFeatures(wantTitle), stripFeatures(gotTitle))
  );
  const artistScore = similarity(wantArtist, gotArtist);

  return {
    titleScore,
    artistScore,
    overall: Number((titleScore * 0.45 + artistScore * 0.55).toFixed(3)),
  };
}
