import { google } from 'googleapis';
import { googleConfig } from '../config/ytmusic';

export class YtMusicService {
  private static instance: YtMusicService;
  private oauth2Client: any;
  private hasTokens: boolean = false;

  private constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );
  }

  public static getInstance(): YtMusicService {
    if (!YtMusicService.instance) {
      YtMusicService.instance = new YtMusicService();
    }
    return YtMusicService.instance;
  }

  /**
   * Generates the Google authorize URL with YouTube scopes.
   * offline access_type is required to get a refresh token!
   */
  public getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube.readonly'],
      prompt: 'consent', // Forces Google to show consent screen to ensure refresh token is returned
    });
  }

  /**
   * Exchanges authorization code for tokens and stores them in memory.
   */
  public async handleCallback(code: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.hasTokens = true;
      console.log('[YtMusicService] Google OAuth tokens set successfully.');
      return tokens;
    } catch (err: any) {
      console.error('[YtMusicService] Error during Google token exchange:', err?.message || err);
      throw err;
    }
  }

  /**
   * Fetches the user profile details (YouTube Channel info).
   */
  public async getUserProfile(): Promise<any> {
    if (!this.hasTokens) {
      throw new Error('Unauthorized. No active Google session.');
    }

    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client,
      });

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
  public async getUserPlaylists(): Promise<any> {
    if (!this.hasTokens) {
      throw new Error('Unauthorized. No active Google session.');
    }

    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client,
      });

      console.log('[YtMusicService] Fetching playlists from YouTube...');
      const response = await youtube.playlists.list({
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: 50,
      });

      const items = (response.data.items || []).map((pl: any) => ({
        id: pl.id,
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
  public async getPlaylistTracks(playlistId: string): Promise<any[]> {
    if (!this.hasTokens) {
      throw new Error('Unauthorized. No active Google session.');
    }

    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client,
      });

      console.log(`[YtMusicService] Fetching items for playlist: ${playlistId}...`);
      const response = await youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: playlistId,
        maxResults: 50,
      });

      const items = response.data.items || [];
      const videoIds = items.map(item => item.snippet?.resourceId?.videoId).filter(Boolean) as string[];

      if (videoIds.length === 0) return [];

      console.log(`[YtMusicService] Fetching video details for ${videoIds.length} tracks...`);
      const videoResponse = await youtube.videos.list({
        part: ['snippet'],
        id: videoIds,
      });

      const videos = videoResponse.data.items || [];
      
      const tracks = items.map((item, index) => {
        const videoId = item.snippet?.resourceId?.videoId;
        const video = videos.find(v => v.id === videoId);
        
        return {
          videoId,
          title: item.snippet?.title || 'Unknown Title',
          artist: item.snippet?.videoOwnerChannelTitle || 'Unknown Artist',
          tags: video?.snippet?.tags || [],
          originalIndex: index
        };
      });

      return tracks;
    } catch (err: any) {
      console.error('[YtMusicService] Error fetching playlist tracks:', err?.message || err);
      throw err;
    }
  }

  /**
   * Checks if a session exists.
   */
  public hasSession(): boolean {
    return this.hasTokens;
  }
}
