import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanArtistName, cleanTrackTitle, downloadPlaylistCSV } from './csvExporter';

/**
 * CSV is the export path that costs no YouTube quota, so it is the one most
 * users will actually take. A title containing a comma or a quote must not be
 * able to break the file for every downstream importer.
 */

describe('cleanArtistName', () => {
  it.each([
    ['Tame Impala - Topic', 'Tame Impala'],
    ['Tame Impala Topic', 'Tame Impala'],
    ['ArtistVEVO', 'Artist'],
    ['Artist - VEVO', 'Artist'],
    ['Perfectly Normal Name', 'Perfectly Normal Name'],
  ])('%s -> %s', (input, expected) => {
    expect(cleanArtistName(input)).toBe(expected);
  });

  it('returns the original when stripping would empty the name', () => {
    expect(cleanArtistName('Topic')).toBe('Topic');
  });

  it('handles an empty input', () => {
    expect(cleanArtistName('')).toBe('');
  });
});

describe('cleanTrackTitle', () => {
  it.each([
    ['Song (Official Video)', 'Song'],
    ['Song [Official Audio]', 'Song'],
    ['Song (Lyric Video)', 'Song'],
    ['Song [4K]', 'Song'],
    ['Song (Live at Wembley)', 'Song (Live at Wembley)'],
  ])('%s -> %s', (input, expected) => {
    expect(cleanTrackTitle(input)).toBe(expected);
  });
});

describe('downloadPlaylistCSV', () => {
  let capturedBlob: Blob | null;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    capturedBlob = null;
    clickSpy = vi.fn();

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:mock';
      }),
      revokeObjectURL: vi.fn(),
    });

    // Intercept the synthetic <a> without breaking the rest of the DOM.
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function csvText(): Promise<string> {
    expect(capturedBlob).not.toBeNull();
    return await capturedBlob!.text();
  }

  it('writes a header and one row per track', async () => {
    downloadPlaylistCSV('My Mix', [
      { videoId: 'abc', title: 'Song A', artist: 'Artist A' },
      { videoId: 'def', title: 'Song B', artist: 'Artist B' },
    ]);

    const text = await csvText();
    const lines = text.split('\r\n');
    expect(lines[0]).toBe('"Title","Artist","Album","URL"');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"Song A"');
    expect(lines[1]).toContain('https://www.youtube.com/watch?v=abc');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('escapes embedded quotes by doubling them', async () => {
    downloadPlaylistCSV('Mix', [
      { videoId: 'x', title: 'The "Best" Song', artist: 'Artist' },
    ]);

    expect(await csvText()).toContain('"The ""Best"" Song"');
  });

  it('keeps a comma inside a quoted cell instead of splitting the row', async () => {
    downloadPlaylistCSV('Mix', [
      { videoId: 'x', title: 'Hello, Goodbye', artist: 'The Beatles' },
    ]);

    const rows = (await csvText()).split('\r\n');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toBe('"Hello, Goodbye","The Beatles","","https://www.youtube.com/watch?v=x"');
  });

  it('leads with a UTF-8 BOM so Excel renders non-ASCII titles', async () => {
    downloadPlaylistCSV('Mix', [{ videoId: 'x', title: 'Café Déjà', artist: 'Björk' }]);

    // Blob.text() decodes as UTF-8 and strips a leading BOM per spec, so the
    // BOM has to be asserted on the raw bytes.
    const bytes = new Uint8Array(await capturedBlob!.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    expect(await csvText()).toContain('Café Déjà');
  });

  it('appends recommendations after the main sequence', async () => {
    downloadPlaylistCSV(
      'Mix',
      [{ videoId: 'a', title: 'Main', artist: 'A' }],
      [{ videoId: 'b', title: 'Rec', artist: 'B' }]
    );

    const rows = (await csvText()).split('\r\n');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('"Main"');
    expect(rows[2]).toContain('"Rec"');
  });

  it('emits an empty URL cell when a track has no videoId', async () => {
    downloadPlaylistCSV('Mix', [{ title: 'No Id', artist: 'A' }]);
    expect((await csvText()).split('\r\n')[1]).toBe('"No Id","A","",""');
  });

  it('sanitises the filename so the download cannot traverse paths', async () => {
    let downloadName = '';
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === 'a') {
        el.click = clickSpy;
        const realSetAttribute = el.setAttribute.bind(el);
        el.setAttribute = (name: string, value: string) => {
          if (name === 'download') downloadName = value;
          return realSetAttribute(name, value);
        };
      }
      return el;
    });

    downloadPlaylistCSV('../../etc/passwd', [{ videoId: 'x', title: 'T', artist: 'A' }]);

    expect(downloadName).not.toContain('/');
    expect(downloadName).not.toContain('..');
    expect(downloadName).toMatch(/^[A-Za-z0-9_-]+_Sequence\.csv$/);
  });
});
