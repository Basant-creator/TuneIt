export interface CSVTrackInput {
  videoId?: string;
  title: string;
  artist: string;
  estimatedBpm?: number;
  intensityScore?: number;
  vibeReview?: string;
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
 * Generates and triggers a browser download of a clean CSV playlist file.
 * Compatible with music converters (Soundiiz, TuneMyMusic) & Excel / Notion.
 */
export function downloadPlaylistCSV(
  playlistTitle: string,
  tracks: CSVTrackInput[],
  recommendations: CSVTrackInput[] = []
): void {
  const headers = [
    'Position',
    'Type',
    'Track Title',
    'Artist Name',
    'Estimated BPM',
    'Intensity Score',
    'Vibe Review',
    'YouTube URL',
  ];

  const rows: string[][] = [];

  // Add main sequence tracks
  tracks.forEach((t, i) => {
    rows.push([
      String(i + 1),
      'Sequence Track',
      t.title,
      t.artist,
      t.estimatedBpm ? String(Math.round(t.estimatedBpm)) : '120',
      t.intensityScore !== undefined ? t.intensityScore.toFixed(2) : '0.50',
      t.vibeReview || '',
      t.videoId ? `https://www.youtube.com/watch?v=${t.videoId}` : '',
    ]);
  });

  // Add recommendations if present
  recommendations.forEach((rec, i) => {
    rows.push([
      String(tracks.length + i + 1),
      'AI Recommendation Extension',
      rec.title,
      rec.artist,
      rec.estimatedBpm ? String(Math.round(rec.estimatedBpm)) : '122',
      rec.intensityScore !== undefined ? rec.intensityScore.toFixed(2) : '0.50',
      rec.vibeReview || 'AI Vibe Extension Proposal',
      rec.videoId ? `https://www.youtube.com/watch?v=${rec.videoId}` : '',
    ]);
  });

  // Build CSV string with UTF-8 BOM for Excel
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
