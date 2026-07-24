import { decodeHtmlEntities } from './decodeHtml';

/**
 * Fetches a 30-second official audio preview URL for any track using iTunes Public Search API.
 * This provides direct MP3/M4A audio files that play natively in HTML5 <audio> without video embeds or blocks.
 */
export async function getAudioPreviewUrl(title: string, artist: string): Promise<string | null> {
  try {
    const cleanTitle = decodeHtmlEntities(title).replace(/[\(\)\[\]]/g, '');
    const cleanArtist = decodeHtmlEntities(artist);
    const query = encodeURIComponent(`${cleanTitle} ${cleanArtist}`);

    const response = await fetch(
      `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const trackResult = data.results?.[0];

    if (trackResult && trackResult.previewUrl) {
      return trackResult.previewUrl as string;
    }

    // Fallback search with title only if full title+artist query had no match
    const titleOnlyQuery = encodeURIComponent(cleanTitle);
    const fallbackResponse = await fetch(
      `https://itunes.apple.com/search?term=${titleOnlyQuery}&entity=song&limit=1`
    );

    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      return fallbackData.results?.[0]?.previewUrl || null;
    }

    return null;
  } catch (error) {
    console.error('[AudioPreview] Error fetching audio preview URL:', error);
    return null;
  }
}
