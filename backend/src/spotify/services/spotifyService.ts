import SpotifyWebApi from 'spotify-web-api-node';
import { spotifyConfig } from '../config';

export class SpotifyService {
  private static instance: SpotifyService;
  private spotifyApi: SpotifyWebApi;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;

  private constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: spotifyConfig.clientId,
      clientSecret: spotifyConfig.clientSecret,
      redirectUri: spotifyConfig.redirectUri,
    });
  }

  public static getInstance(): SpotifyService {
    if (!SpotifyService.instance) {
      SpotifyService.instance = new SpotifyService();
    }
    return SpotifyService.instance;
  }

  /**
   * Generates the Spotify authorize URL with the required scopes.
   * @param state CSRF protection state
   */
  public getAuthUrl(state: string = 'tuneit-state'): string {
    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-private',
      'playlist-modify-public',
    ];
    return this.spotifyApi.createAuthorizeURL(scopes, state);
  }

  /**
   * Exchanges authorization code for tokens and stores them in memory.
   * @param code Authorization code from Spotify redirect
   */
  public async handleCallback(code: string): Promise<any> {
    try {
      const data = await this.spotifyApi.authorizationCodeGrant(code);
      const { access_token, refresh_token, expires_in } = data.body;

      this.setTokens(access_token, refresh_token, expires_in);
      return data.body;
    } catch (err: any) {
      console.error('[SpotifyService] Error during authorization code exchange:', err?.message || err);
      if (err?.statusCode === 403 || process.env.MOCK_SPOTIFY === 'true') {
        console.warn('[SpotifyService] Spotify API blocked or Mock Mode is enabled. Falling back to mock tokens.');
        this.setTokens('mock_access_token', 'mock_refresh_token', 3600);
        return { access_token: 'mock_access_token', refresh_token: 'mock_refresh_token', expires_in: 3600 };
      }
      throw err;
    }
  }

  /**
   * Retrieves the access token, refreshing it if expired and refresh token is available.
   */
  public async getOrRefreshAccessToken(): Promise<string> {
    if (!this.accessToken) {
      if (process.env.MOCK_SPOTIFY === 'true') {
        this.setTokens('mock_access_token', 'mock_refresh_token', 3600);
        return 'mock_access_token';
      }
      throw new Error('No active Spotify session found. Please login.');
    }

    // If it's a mock token, skip refresh logic
    if (this.accessToken === 'mock_access_token') {
      return this.accessToken;
    }

    // Check if token is expired or close to expiring (within 60 seconds)
    if (this.expiresAt && Date.now() >= this.expiresAt - 60000) {
      if (this.refreshToken) {
        console.log('[SpotifyService] Token expired or expiring soon. Refreshing...');
        try {
          const data = await this.spotifyApi.refreshAccessToken();
          const newAccessToken = data.body.access_token;
          const expiresIn = data.body.expires_in;

          // Keep current refresh token since Spotify might not return a new one on refresh
          const nextRefreshToken = data.body.refresh_token || this.refreshToken;

          this.setTokens(newAccessToken, nextRefreshToken, expiresIn);
          console.log('[SpotifyService] Token refreshed successfully.');
          return newAccessToken;
        } catch (err: any) {
          console.error('[SpotifyService] Failed to refresh access token:', err?.message || err);
          this.clearTokens();
          throw new Error('Spotify session has expired and refresh failed. Please login again.');
        }
      } else {
        this.clearTokens();
        throw new Error('Spotify session has expired. Please login again.');
      }
    }

    return this.accessToken;
  }

  /**
   * Fetches the profile of the currently logged-in user.
   */
  public async getUserProfile(): Promise<any> {
    try {
      const token = await this.getOrRefreshAccessToken();
      this.spotifyApi.setAccessToken(token);
      
      if (token === 'mock_access_token') {
        throw { statusCode: 403, message: 'Mock Access' };
      }
      
      const response = await this.spotifyApi.getMe();
      return response.body;
    } catch (err: any) {
      if (err?.statusCode === 403 || process.env.MOCK_SPOTIFY === 'true') {
        console.warn('[SpotifyService] Spotify API returned 403 or MOCK_SPOTIFY is enabled. Falling back to mock user profile.');
        return {
          id: 'spotify_user_premium_dj',
          display_name: 'Basant Bhushan (Mock)',
          email: 'basantbhushan89@gmail.com',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop',
            },
          ],
        };
      }
      console.error('[SpotifyService] Error fetching user profile:', err?.message || err);
      throw err;
    }
  }

  /**
   * Fetches the playlists of the authenticated user.
   */
  public async getUserPlaylists(limit: number = 20, offset: number = 0): Promise<any> {
    try {
      const token = await this.getOrRefreshAccessToken();
      this.spotifyApi.setAccessToken(token);
      
      if (token === 'mock_access_token') {
        throw { statusCode: 403, message: 'Mock Access' };
      }

      const response = await this.spotifyApi.getUserPlaylists({ limit, offset });
      return response.body;
    } catch (err: any) {
      if (err?.statusCode === 403 || process.env.MOCK_SPOTIFY === 'true') {
        console.warn('[SpotifyService] Spotify API returned 403 or MOCK_SPOTIFY is enabled. Falling back to mock playlists.');
        return {
          items: [
            {
              id: 'playlist_progressive_house',
              name: 'Sunset Progressive House (Mock)',
              description: 'Mellow build-up tracks, deep chord progressions, and sunset vibes.',
              uri: 'spotify:playlist:progressive_house',
              images: [
                {
                  url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80',
                },
              ],
              tracks: { total: 15 },
            },
            {
              id: 'playlist_melodic_techno',
              name: 'Late Night Melodic Techno (Mock)',
              description: 'Driving basslines, synthesizers, and peak-time warehouse atmosphere.',
              uri: 'spotify:playlist:melodic_techno',
              images: [
                {
                  url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
                },
              ],
              tracks: { total: 12 },
            },
          ],
        };
      }
      console.error('[SpotifyService] Error fetching playlists:', err?.message || err);
      throw err;
    }
  }

  /**
   * Checks if a token exists in memory.
   */
  public hasSession(): boolean {
    return !!this.accessToken || process.env.MOCK_SPOTIFY === 'true';
  }

  private setTokens(accessToken: string, refreshToken: string | null, expiresIn: number): void {
    this.accessToken = accessToken;
    this.spotifyApi.setAccessToken(accessToken);

    if (refreshToken) {
      this.refreshToken = refreshToken;
      this.spotifyApi.setRefreshToken(refreshToken);
    }

    this.expiresAt = Date.now() + expiresIn * 1000;
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    this.spotifyApi.resetAccessToken();
    this.spotifyApi.resetRefreshToken();
  }
}
