import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { findAudioPreview, getAudioPreviewUrl } from './audioPreview';

/**
 * The preview resolver must never hand back a confidently wrong song. These
 * tests pin the failures that were reported: "How Long" previewing as Ace
 * rather than Charlie Puth, and a title-only fallback grabbing whatever the
 * catalogue listed first.
 */

const fetchMock = vi.fn();

function itunes(results: Array<Record<string, unknown>>) {
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const song = (trackName: string, artistName: string, previewUrl = 'https://cdn/p.m4a') => ({
  trackName,
  artistName,
  previewUrl,
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('query construction', () => {
  it('strips "- Topic" and upload clutter before searching', async () => {
    fetchMock.mockResolvedValue(itunes([song('Blinding Lights', 'The Weeknd')]));

    await findAudioPreview('Blinding Lights (Official Video)', 'The Weeknd - Topic');

    const firstUrl = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(firstUrl).toContain('Blinding Lights The Weeknd');
    expect(firstUrl).not.toContain('Topic');
    expect(firstUrl).not.toContain('Official Video');
  });

  it('stops early on a strong match instead of issuing every query', async () => {
    fetchMock.mockResolvedValue(itunes([song('505', 'Arctic Monkeys')]));

    await findAudioPreview('505', 'Arctic Monkeys - Topic');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('rejecting the wrong song', () => {
  it('refuses a right title by a clearly different artist', async () => {
    // Regression: searching "How Long" returned Ace's 1976 track, and the old
    // resolver played it because it never checked the artist.
    fetchMock.mockResolvedValue(itunes([song('How Long', 'Ace')]));

    const match = await findAudioPreview('How Long', 'Charlie Puth - Topic');

    expect(match).toBeNull();
  });

  it('returns null rather than the first unrelated result', async () => {
    fetchMock.mockResolvedValue(itunes([song('Rob a Bank', 'Scott Shields')]));

    expect(await findAudioPreview('Rob A Bank', 'Confetti - Topic')).toBeNull();
  });

  it('skips results that carry no preview url', async () => {
    fetchMock.mockResolvedValue(
      itunes([{ trackName: 'How Long', artistName: 'Charlie Puth', previewUrl: undefined }])
    );

    expect(await findAudioPreview('How Long', 'Charlie Puth')).toBeNull();
  });

  it('returns null when the catalogue has nothing', async () => {
    fetchMock.mockResolvedValue(itunes([]));
    expect(await findAudioPreview('zzz nonexistent', 'Nobody')).toBeNull();
  });
});

describe('choosing among candidates', () => {
  it('prefers the exact release over a remix', async () => {
    fetchMock.mockResolvedValue(
      itunes([
        song('Blinding Lights (Remix)', 'The Weeknd & ROSALÍA', 'https://cdn/remix.m4a'),
        song('Blinding Lights', 'The Weeknd', 'https://cdn/original.m4a'),
      ])
    );

    const match = await findAudioPreview('Blinding Lights (Official Video)', 'The Weeknd - Topic');

    expect(match?.previewUrl).toBe('https://cdn/original.m4a');
    expect(match?.matchedTitle).toBe('Blinding Lights');
    expect(match?.approximate).toBe(false);
  });

  it('flags a usable but inexact match as approximate', async () => {
    fetchMock.mockResolvedValue(
      itunes([song('Professional Griefers (feat. Gerard Way) [Radio Edit]', 'deadmau5')])
    );

    const match = await findAudioPreview('Professional Griefers', 'deadmau5 - Topic');

    expect(match).not.toBeNull();
    expect(match?.confidence).toBeGreaterThan(0.55);
  });

  it('reports what was matched so the UI can show it', async () => {
    fetchMock.mockResolvedValue(itunes([song('Cake By the Ocean', 'DNCE')]));

    const match = await findAudioPreview('Cake By The Ocean [Official Music Video]', 'DNCE - Topic');

    expect(match?.matchedTitle).toBe('Cake By the Ocean');
    expect(match?.matchedArtist).toBe('DNCE');
  });
});

describe('resilience', () => {
  it('survives a network failure on one strategy', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValue(itunes([song('505', 'Arctic Monkeys')]));

    const match = await findAudioPreview('505', 'Arctic Monkeys - Topic');
    expect(match?.matchedArtist).toBe('Arctic Monkeys');
  });

  it('survives a non-OK response', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 503 }));
    expect(await findAudioPreview('Anything', 'Anyone')).toBeNull();
  });

  it('survives a malformed body', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"results": "not-an-array"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(await findAudioPreview('Anything', 'Anyone')).toBeNull();
  });
});

describe('getAudioPreviewUrl compatibility wrapper', () => {
  it('returns just the url for a trusted match', async () => {
    fetchMock.mockResolvedValue(itunes([song('505', 'Arctic Monkeys', 'https://cdn/505.m4a')]));
    expect(await getAudioPreviewUrl('505', 'Arctic Monkeys - Topic')).toBe('https://cdn/505.m4a');
  });

  it('returns null when nothing is trustworthy', async () => {
    fetchMock.mockResolvedValue(itunes([song('How Long', 'Ace')]));
    expect(await getAudioPreviewUrl('How Long', 'Charlie Puth')).toBeNull();
  });
});
