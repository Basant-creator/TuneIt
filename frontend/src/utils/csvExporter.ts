export interface CSVTrackInput {
  videoId?: string;
  title: string;
  artist: string;
  album?: string;
  estimatedBpm?: number;
  intensityScore?: number;
  vibeReview?: string;
}

/**
 * Cleans YouTube artist strings by removing common YouTube channel suffixes
 * such as "- Topic", "Release - Topic", "- VEVO", etc.
 */
export function cleanArtistName(artist: string): string {
  if (!artist) return '';
  const cleaned = artist
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*topic$/i, '')
    .replace(/\s*-\s*vevo$/i, '')
    .replace(/\s*vevo$/i, '')
    .trim();
  return cleaned || artist;
}

/**
 * Cleans YouTube track titles by removing video clutter like (Official Video),
 * [Official HD Video], (Lyric Video), [Official Audio], etc.
 */
export function cleanTrackTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*[\(\[\{](official\s*(music\s*)?(video|audio|hd|4k|lyric\s*video|visualizer)|hd|4k|lyric\s*video|official)[\)\]\}]/gi, '')
    .trim();
}

/**
 * Escapes a cell value for CSV formatting.
 */
function escapeCSVCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and triggers a browser download of a clean universal CSV playlist file.
 * Industry-standard header: Title, Artist, Album, URL
 * Fully compatible with Apple Music, Soundiiz, TuneMyMusic, SongShift & Excel.
 */
export function downloadPlaylistCSV(
  playlistTitle: string,
  tracks: CSVTrackInput[],
  recommendations: CSVTrackInput[] = []
): void {
  const headers = ['Title', 'Artist', 'Album', 'URL'];

  const rows: string[][] = [];

  // Add main sequence tracks
  tracks.forEach((t) => {
    const title = cleanTrackTitle(t.title);
    const artist = cleanArtistName(t.artist);
    const album = t.album ? t.album.trim() : '';
    const url = t.videoId ? `https://www.youtube.com/watch?v=${t.videoId}` : '';

    rows.push([title, artist, album, url]);
  });

  // Add recommendations if present
  recommendations.forEach((rec) => {
    const title = cleanTrackTitle(rec.title);
    const artist = cleanArtistName(rec.artist);
    const album = rec.album ? rec.album.trim() : '';
    const url = rec.videoId ? `https://www.youtube.com/watch?v=${rec.videoId}` : '';

    rows.push([title, artist, album, url]);
  });

  // Build CSV string with UTF-8 BOM for Excel & Apple Music importers
  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCSVCell).join(','),
      ...rows.map((row) => row.map(escapeCSVCell).join(',')),
    ].join('\r\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const sanitizedTitle = (playlistTitle || 'TuneIt_Playlist')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);

  link.href = url;
  link.setAttribute('download', `${sanitizedTitle}_Sequence.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
