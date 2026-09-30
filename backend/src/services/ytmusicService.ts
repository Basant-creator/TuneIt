import crypto from 'crypto';
import { google, youtube_v3 } from 'googleapis';
import { googleConfig } from '../config/ytmusic';
import { isDeletedOrUnavailableTrack } from '../utils/trackUtils';

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

export interface YouTubeUserProfile {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
}

export interface YouTubePlaylistImage {
  url: string;
}

export interface YouTubePlaylistItem {
  id: string;
  name: string;
  description: string;
  uri: string;
  images: YouTubePlaylistImage[];
  tracks: { total: number };
}

export interface YouTubeTrack {
  videoId: string;
  title: string;
  artist: string;
  tags: string[];
  originalIndex: number;
}

/** Google's access tokens last an hour; used only if it omits expiry_date. */
const ACCESS_TOKEN_FALLBACK_MS = 60 * 60 * 1000;
/** Treat a token as expired this long before Google does. */
const EXPIRY_MARGIN_MS = 60 * 1000;

export class YtMusicService {
  private oauth2Client: any;
  private hasTokens = false;
  /** When Google's access token stops working (ms since epoch); null until signed in. */
  private expiresAt: number | null = null;
  /** sha256 of the YouTube channel id, for the export limit. Memory only. */
  private accountKey: string | null = null;

  /**
   * One instance per browser session. Tokens live on the instance, never on the
   * class, so concurrent visitors cannot read each other's YouTube account.
   */
  public constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );
  }

  /**
   * Helper getter for YouTube API client v3 using active OAuth client.
   */
  private getYoutubeClient(): youtube_v3.Youtube {
    return google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  /**
   * Guards service methods to ensure an active Google session exists.
   */
  private ensureAuthenticated(): void {
    if (!this.hasSession()) {
      throw new Error('Unauthorized. No active Google session.');
    }
  }

  /**
   * Generates the Google authorize URL with YouTube scopes.
   *
   * Sign-in is temporary by design: `access_type: 'online'` means Google issues
   * only a short-lived access token (about an hour) and no refresh token, so
   * TuneIt cannot act on the account once that token expires or is revoked at
   * sign-out. `select_account`
   * makes Google ask which account to use every time, which matters on a
   * shared computer.
   */
  public getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'online',
      scope: ['https://www.googleapis.com/auth/youtube'],
      prompt: 'select_account',
      ...(state ? { state } : {}),
    });
  }

  /**
   * Exchanges the authorization code for an access token, held in memory only.
   */
  public async handleCallback(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.applyTokens(tokens);
      console.log('[YtMusicService] Google access token set for this visit.');
    } catch (err: any) {
      console.error('[YtMusicService] Error during Google token exchange:', err?.message || err);
      throw err;
    }
  }

  /**
   * Keeps only the short-lived access token. A refresh token is dropped even
   * if Google sends one, so the session can never outlive the access token.
   */
  public applyTokens(tokens: {
    access_token?: string | null;
    expiry_date?: number | null;
    token_type?: string | null;
    scope?: string;
    refresh_token?: string | null;
  }): void {
    if (!tokens?.access_token) throw new Error('Unauthorized. Google returned no access token.');
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date ?? undefined,
      token_type: tokens.token_type ?? undefined,
      scope: tokens.scope,
    });
    this.expiresAt = tokens.expiry_date ?? Date.now() + ACCESS_TOKEN_FALLBACK_MS;
    this.hasTokens = true;
  }

  /** When this sign-in ends, or null if it never started. */
  public getExpiresAt(): number | null {
    return this.expiresAt;
  }

  /**
   * Ends the sign-in: asks Google to revoke the access token, then forgets it.
   * Revocation is best effort — the token expires within the hour regardless,
   * and signing out must never fail because Google is unreachable.
   */
  public async signOut(): Promise<void> {
    // Revoke anything Google still honours, including a token in its last
    // minute that hasSession() already treats as expired.
    const wasLive = this.hasTokens && this.expiresAt !== null && Date.now() < this.expiresAt;
    const credentials = this.oauth2Client.credentials;
    this.hasTokens = false;
    this.expiresAt = null;
    this.accountKey = null;
    if (wasLive && credentials?.access_token) {
      try {
        await this.oauth2Client.revokeToken(credentials.access_token);
      } catch (err: any) {
        console.warn('[YtMusicService] Token revocation failed (it expires on its own):', err?.message || err);
      }
    }
    this.oauth2Client.setCredentials({});
  }

  /**
   * A stable, anonymous key for the signed-in YouTube account: a sha256 of the
   * channel id, kept on this in-memory session only. Used so the daily export
   * limit follows the account rather than the session, which a fresh sign-in
   * would otherwise reset.
   */
  public async getAccountKey(): Promise<string> {
    this.ensureAuthenticated();
    if (this.accountKey) return this.accountKey;
    const response = await this.getYoutubeClient().channels.list({ part: ['id'], mine: true });
    const channelId = response.data.items?.[0]?.id;
    if (!channelId) throw new Error('No YouTube channel associated with this account.');
    this.accountKey = crypto.createHash('sha256').update(channelId).digest('hex');
    return this.accountKey;
  }

  /**
   * Fetches the user profile details (YouTube Channel info).
   */
  public async getUserProfile(): Promise<YouTubeUserProfile> {
    this.ensureAuthenticated();

    try {
      const youtube = this.getYoutubeClient();

      console.log('[YtMusicService] Fetching YouTube channel profile...');
      const response = await youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new Error('No YouTube channel associated with this account.');
      }

      return {
        id: channel.id || 'youtube_channel_user',
        display_name: channel.snippet?.title || 'YouTube User',
        email: 'Authenticated Session',
        images: channel.snippet?.thumbnails?.default?.url
          ? [{ url: channel.snippet.thumbnails.default.url }]
          : [],
      };
    } catch (err: any) {
      console.error('[YtMusicService] Error fetching YouTube profile:', err?.message || err);
      throw err;
    }
  }

  /**
   * Fetches the playlists owned by the authenticated user.
   */
  public async getUserPlaylists(): Promise<{ items: YouTubePlaylistItem[] }> {
    this.ensureAuthenticated();

    try {
      const youtube = this.getYoutubeClient();

      console.log('[YtMusicService] Fetching playlists from YouTube...');
      const response = await youtube.playlists.list({
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: 50,
      });

      const items: YouTubePlaylistItem[] = (response.data.items || []).map((pl) => ({
        id: pl.id || '',
        name: pl.snippet?.title || 'Untitled Playlist',
        description: pl.snippet?.description || '',
        uri: `youtube:playlist:${pl.id}`,
        images: pl.snippet?.thumbnails
          ? Object.values(pl.snippet.thumbnails).map((t: any) => ({ url: t.url }))
          : [],
        tracks: { total: pl.contentDetails?.itemCount || 0 },
      }));

      return { items };
    } catch (err: any) {
      console.error('[YtMusicService] Error fetching playlists:', err?.message || err);
      throw err;
    }
  }

  /**
   * Fetches the tracks for a given playlist and gets their tags.
   */
  public async getPlaylistTracks(playlistId: string): Promise<YouTubeTrack[]> {
    this.ensureAuthenticated();

    try {
      const youtube = this.getYoutubeClient();

      console.log(`[YtMusicService] Fetching items for playlist: ${playlistId}...`);
      let allItems: any[] = [];
      let nextPageToken: string | undefined;

      do {
        const response = await youtube.playlistItems.list({
          part: ['snippet'],
          playlistId,
          maxResults: 50,
          pageToken: nextPageToken,
        });

        if (response.data.items) {
          allItems = allItems.concat(response.data.items);
        }
        nextPageToken = response.data.nextPageToken || undefined;
      } while (nextPageToken);

      console.log(`[YtMusicService] Fetched ${allItems.length} total items. Fetching video details...`);

      const videoIds = allItems
        .map((item) => item.snippet?.resourceId?.videoId)
        .filter(Boolean) as string[];

      if (videoIds.length === 0) return [];

      let allVideos: any[] = [];
      // YouTube videos.list maxResults is 50, so chunk videoIds into batches of 50
      const CHUNK_SIZE = 50;
      for (let i = 0; i < videoIds.length; i += CHUNK_SIZE) {
        const chunk = videoIds.slice(i, i + CHUNK_SIZE);
        const videoResponse = await youtube.videos.list({
          part: ['snippet'],
          id: chunk,
        });
        if (videoResponse.data.items) {
          allVideos = allVideos.concat(videoResponse.data.items);
        }
      }

      const validTracks: YouTubeTrack[] = [];
      let skippedCount = 0;

      allItems.forEach((item, index) => {
        const videoId = item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title || 'Unknown Title';
        const rawArtist = item.snippet?.videoOwnerChannelTitle || 'Unknown Artist';
        const artist = cleanArtistName(rawArtist);
        const video = allVideos.find((v) => v.id === videoId);

        if (!videoId || isDeletedOrUnavailableTrack(title, artist, videoId)) {
          skippedCount++;
          return;
        }

        validTracks.push({
          videoId,
          title,
          artist,
          tags: video?.snippet?.tags || [],
          originalIndex: index,
        });
      });

      if (skippedCount > 0) {
        console.log(`[YtMusicService] Filtered out ${skippedCount} deleted/unavailable track(s) from playlist: ${playlistId}`);
      }

      return validTracks;
    } catch (err: any) {
      console.error('[YtMusicService] Error fetching playlist tracks:', err?.message || err);
      throw err;
    }
  }

  /**
   * Creates a new playlist on YouTube.
   */
  public async createPlaylist(title: string, description?: string): Promise<{ id: string; title: string; url: string }> {
    this.ensureAuthenticated();

    try {
      const youtube = this.getYoutubeClient();

      console.log(`[YtMusicService] Creating playlist "${title}"...`);
      const response = await youtube.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title.trim(),
            description: description || 'Created and optimized with TuneIt Drift Engine',
          },
          status: {
            privacyStatus: 'private',
          },
        },
      });

      const playlistId = response.data.id;
      if (!playlistId) {
        throw new Error('Failed to retrieve ID for created playlist.');
      }

      console.log(`[YtMusicService] Playlist created successfully with ID: ${playlistId}`);

      return {
        id: playlistId,
        title: response.data.snippet?.title || title,
        url: `https://music.youtube.com/playlist?list=${playlistId}`,
      };
    } catch (err: any) {
      console.error('[YtMusicService] Error creating playlist:', err?.message || err);
      throw err;
    }
  }

  /**
   * Adds video tracks to an existing playlist in order.
   */
  public async addTracksToPlaylist(playlistId: string, videoIds: string[]): Promise<void> {
    this.ensureAuthenticated();

    try {
      const youtube = this.getYoutubeClient();

      console.log(`[YtMusicService] Adding ${videoIds.length} tracks to playlist ${playlistId}...`);

      for (let i = 0; i < videoIds.length; i++) {
        const videoId = videoIds[i];
        try {
          await youtube.playlistItems.insert({
            part: ['snippet'],
            requestBody: {
              snippet: {
                playlistId,
                resourceId: {
                  kind: 'youtube#video',
                  videoId,
                },
              },
            },
          });
        } catch (itemErr: any) {
          console.error(`[YtMusicService] Failed to add track ${videoId} (index ${i}):`, itemErr?.message || itemErr);
          // Continue inserting remaining tracks even if one fails
        }
      }

      console.log(`[YtMusicService] Finished inserting tracks into playlist ${playlistId}.`);
    } catch (err: any) {
      console.error('[YtMusicService] Error adding tracks to playlist:', err?.message || err);
      throw err;
    }
  }

  /**
   * Searches YouTube for a track by query string (title + artist).
   */
  public async searchTrack(query: string): Promise<YouTubeTrack | null> {
    this.ensureAuthenticated();

    try {
      const youtube = this.getYoutubeClient();

      // Append 'topic audio' to prioritize official embeddable YouTube Topic releases over VEVO blocked videos
      const response = await youtube.search.list({
        part: ['snippet'],
        q: `${query} topic audio`,
        type: ['video'],
        maxResults: 1,
      });

      const item = response.data.items?.[0];
      if (!item || !item.id?.videoId) return null;

      return {
        videoId: item.id.videoId,
        title: item.snippet?.title || query,
        artist: cleanArtistName(item.snippet?.channelTitle || 'Unknown Artist'),
        tags: [],
        originalIndex: 0,
      };
    } catch (err: any) {
      console.error(`[YtMusicService] Error searching track for query "${query}":`, err?.message || err);
      return null;
    }
  }

  /**
   * True while the access token is still good. With online access there is no
   * refresh token, so an expired token means signed out; stopping a minute
   * early keeps a request from starting with seconds to spare.
   */
  public hasSession(now: number = Date.now()): boolean {
    return this.hasTokens && this.expiresAt !== null && now < this.expiresAt - EXPIRY_MARGIN_MS;
  }

  /** Signed in once, and that sign-in has now run out. */
  public isExpired(now: number = Date.now()): boolean {
    return this.expiresAt !== null && !this.hasSession(now);
  }
}
