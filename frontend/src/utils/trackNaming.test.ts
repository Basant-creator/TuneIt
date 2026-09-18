import { describe, expect, it } from 'vitest';
import {
  cleanArtistName,
  cleanTrackTitle,
  normalizeForMatch,
  scoreMatch,
  similarity,
  stripFeatures,
} from './trackNaming';

/**
 * These guard the preview-matching bug: searching iTunes with raw YouTube
 * strings returned the wrong song, most visibly previewing Charlie Puth's
 * "How Long" as a 1976 track by Ace.
 */

describe('cleanArtistName', () => {
  it.each([
    ['The Weeknd - Topic', 'The Weeknd'],
    ['Arctic Monkeys - Topic', 'Arctic Monkeys'],
    ['ArtistVEVO', 'Artist'],
    ['Artist - VEVO', 'Artist'],
    ['Eric Prydz', 'Eric Prydz'],
  ])('%s -> %s', (input, expected) => {
    expect(cleanArtistName(input)).toBe(expected);
  });

  it('keeps the original when stripping would empty it', () => {
    expect(cleanArtistName('Topic')).toBe('Topic');
  });
});

describe('cleanTrackTitle', () => {
  it.each([
    ['Blinding Lights (Official Video)', 'Blinding Lights'],
    ['Cake By The Ocean [Official Music Video]', 'Cake By The Ocean'],
    ['Song (Lyric Video)', 'Song'],
    ['Song [4K]', 'Song'],
    ['Song - Official Video', 'Song'],
    ['Song (Visualizer)', 'Song'],
    ['505', '505'],
  ])('%s -> %s', (input, expected) => {
    expect(cleanTrackTitle(input)).toBe(expected);
  });

  it('keeps bracketed content that identifies a different recording', () => {
    expect(cleanTrackTitle('Song (Live at Wembley)')).toBe('Song (Live at Wembley)');
    expect(cleanTrackTitle('Song (Acoustic)')).toBe('Song (Acoustic)');
  });

  it('never returns an empty string', () => {
    expect(cleanTrackTitle('(Official Video)')).not.toBe('');
  });
});

describe('stripFeatures', () => {
  it.each([
    ['Praise The Lord (feat. Skepta)', 'Praise The Lord'],
    ['Song [ft. Someone]', 'Song'],
    ['Song featuring Someone', 'Song'],
    ['Song', 'Song'],
  ])('%s -> %s', (input, expected) => {
    expect(stripFeatures(input)).toBe(expected);
  });
});

describe('normalizeForMatch', () => {
  it('folds diacritics, case and punctuation', () => {
    expect(normalizeForMatch('Café Déjà-Vu!')).toBe('cafe deja vu');
  });

  it('expands an ampersand so "&" and "and" agree', () => {
    expect(normalizeForMatch('Glitter & Gold')).toBe('glitter and gold');
    expect(normalizeForMatch('Glitter and Gold')).toBe('glitter and gold');
  });
});

describe('similarity', () => {
  it('scores an exact match at 1', () => {
    expect(similarity('Blinding Lights', 'Blinding Lights')).toBe(1);
  });

  it('ranks the exact release above a decorated one', () => {
    // The remix used to tie with the original at 1.0, so the preview played
    // "Blinding Lights (Remix)" instead of the track in the playlist.
    const exact = similarity('Blinding Lights', 'Blinding Lights');
    const remix = similarity('Blinding Lights', 'Blinding Lights Remix');
    expect(exact).toBeGreaterThan(remix);
  });

  it('still accepts a decorated title reasonably well', () => {
    expect(similarity('505', '505 Live')).toBeGreaterThan(0.5);
  });

  it('scores unrelated titles low', () => {
    expect(similarity('How Long', 'Bohemian Rhapsody')).toBeLessThan(0.2);
  });

  it('handles empty input', () => {
    expect(similarity('', 'Anything')).toBe(0);
  });
});

describe('scoreMatch', () => {
  it('rejects the right title by the wrong artist', () => {
    // The exact failure users reported.
    const wrong = scoreMatch('How Long', 'Charlie Puth', 'How Long', 'Ace');
    expect(wrong.artistScore).toBeLessThan(0.34);

    const right = scoreMatch('How Long', 'Charlie Puth', 'How Long', 'Charlie Puth');
    expect(right.overall).toBeGreaterThan(0.9);
    expect(right.overall).toBeGreaterThan(wrong.overall);
  });

  it('accepts a feat. variant of the same track', () => {
    const score = scoreMatch(
      'Praise The Lord (Da Shine)',
      'A$AP Rocky',
      'Praise The Lord (Da Shine) [feat. Skepta]',
      'A$AP Rocky'
    );
    expect(score.overall).toBeGreaterThan(0.6);
  });

  it('weights the artist above the title', () => {
    const titleOnly = scoreMatch('Song', 'Artist A', 'Song', 'Completely Different');
    const artistOnly = scoreMatch('Song', 'Artist A', 'Different Song Name', 'Artist A');
    expect(artistOnly.overall).toBeGreaterThan(titleOnly.overall);
  });
});
