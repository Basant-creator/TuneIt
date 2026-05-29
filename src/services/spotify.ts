import { env } from '@/lib/env';
import type {
  SpotifyTrack,
  SpotifyPlaylist,
  SpotifyUserProfile,
  SpotifyAudioFeatures,
} from '@/types/spotify';

/**
 * Spotify API Integration Client
 * Contains direct scopes, redirect builders, code exchanges, and data fetching handlers.
 */
export class SpotifyService {
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    if (accessToken) this.accessToken = accessToken;
  }

  /**
   * Builds the Spotify Authorization Page URL for user login and permissions consent
   * @param state Arbitrary CSRF protection key
   */
  static getAuthUrl(state: string): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.spotifyClientId,
      scope: scopes,
      redirect_uri: env.spotifyRedirectUri,
      state: state,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  /**
   * Exchanges an OAuth authorization code for Spotify Access and Refresh Tokens
   * @param code Code returned from Spotify login redirect
   */
  static async exchangeCodeForToken(
    code: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    console.log(
      '[Spotify SDK] Triggering OAuth credentials exchange with code:',
      code
    );

    // In a real application, make a POST call:
    // URL: https://accounts.spotify.com/api/token
    // Body: grant_type=authorization_code, code, redirect_uri
    // Headers: Authorization Basic Base64(client_id:client_secret)

    return {
      accessToken: 'mock_spotify_access_token_value',
      refreshToken: 'mock_spotify_refresh_token_value',
      expiresIn: 3600,
    };
  }

  /**
   * Fetches the user profile details for current session
   */
  async getUserProfile(): Promise<SpotifyUserProfile> {
    if (!this.accessToken) throw new Error('Missing Spotify access token');

    // Endpoint: GET https://api.spotify.com/v1/me
    return {
      id: 'spotify_user_premium_dj',
      displayName: 'Premium DJ Sequencer',
      email: 'dj.mixer@example.com',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop',
        },
      ],
    };
  }

  /**
   * Fetches matching playlists owned by the authenticated Spotify user
   */
  async getUserPlaylists(limit = 20): Promise<SpotifyPlaylist[]> {
    if (!this.accessToken) throw new Error('Missing Spotify access token');
    console.log('[Spotify SDK] Fetching playlists, limit:', limit);

    // Endpoint: GET https://api.spotify.com/v1/me/playlists
    return [
      {
        id: 'playlist_progressive_house',
        name: 'Sunset Progressive House',
        description:
          'Mellow build-up tracks, deep chord progressions, and sunset vibes.',
        uri: 'spotify:playlist:progressive_house',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80',
          },
        ],
        tracksCount: 15,
      },
      {
        id: 'playlist_melodic_techno',
        name: 'Late Night Melodic Techno',
        description:
          'Driving basslines, synthesizers, and peak-time warehouse atmosphere.',
        uri: 'spotify:playlist:melodic_techno',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
          },
        ],
        tracksCount: 12,
      },
    ];
  }

  /**
   * Retrieves tracks stored inside a specific Spotify Playlist
   * @param playlistId Spotify Playlist ID
   */
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    if (!this.accessToken) throw new Error('Missing Spotify access token');
    console.log('[Spotify SDK] Fetching tracks for playlist:', playlistId);

    // Endpoint: GET https://api.spotify.com/v1/playlists/{playlistId}/tracks
    // Returns basic tracks info. Audio features are resolved in another step.
    return [
      {
        id: 'track_progressive_01',
        name: 'Opus',
        uri: 'spotify:track:opus',
        durationMs: 543000,
        previewUrl: null,
        artists: [
          { id: 'pryda', name: 'Eric Prydz', uri: 'spotify:artist:pryda' },
        ],
        album: {
          id: 'album_opus',
          name: 'Opus (Album)',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150',
            },
          ],
        },
      },
      {
        id: 'track_progressive_02',
        name: 'Strobe',
        uri: 'spotify:track:strobe',
        durationMs: 637000,
        previewUrl: null,
        artists: [
          { id: 'deadmau5', name: 'deadmau5', uri: 'spotify:artist:deadmau5' },
        ],
        album: {
          id: 'album_strobe',
          name: 'For Lack of a Better Name',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150',
            },
          ],
        },
      },
      {
        id: 'track_progressive_03',
        name: 'Language',
        uri: 'spotify:track:language',
        durationMs: 368000,
        previewUrl: null,
        artists: [
          {
            id: 'porter_robinson',
            name: 'Porter Robinson',
            uri: 'spotify:artist:porter_robinson',
          },
        ],
        album: {
          id: 'album_language',
          name: 'Language EP',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150',
            },
          ],
        },
      },
    ];
  }

  /**
   * Fetches Audio Analysis/Features (Tempo, Key, Energy) in batches of 100 for tracks
   * @param trackIds Array of Spotify Track IDs
   */
  async getAudioFeaturesForTracks(
    trackIds: string[]
  ): Promise<SpotifyAudioFeatures[]> {
    if (!this.accessToken) throw new Error('Missing Spotify access token');

    // Endpoint: GET https://api.spotify.com/v1/audio-features?ids={trackIds.join(',')}
    const mockDb: Record<string, Omit<SpotifyAudioFeatures, 'id'>> = {
      track_progressive_01: {
        tempo: 126,
        key: 5, // F (or 8B in Camelot)
        mode: 0, // Minor
        energy: 0.84,
        danceability: 0.73,
        valence: 0.32,
        acousticness: 0.01,
        instrumentalness: 0.9,
      },
      track_progressive_02: {
        tempo: 128,
        key: 11, // B (or 10A/10B in Camelot)
        mode: 0, // Minor
        energy: 0.72,
        danceability: 0.65,
        valence: 0.38,
        acousticness: 0.05,
        instrumentalness: 0.85,
      },
      track_progressive_03: {
        tempo: 128,
        key: 5, // F (or 8B in Camelot)
        mode: 1, // Major
        energy: 0.89,
        danceability: 0.68,
        valence: 0.44,
        acousticness: 0.02,
        instrumentalness: 0.3,
      },
    };

    return trackIds.map((id) => {
      const info = mockDb[id] || {
        tempo: 120 + Math.floor(Math.random() * 15),
        key: Math.floor(Math.random() * 12),
        mode: Math.random() > 0.5 ? 1 : 0,
        energy: 0.5 + Math.random() * 0.4,
        danceability: 0.5 + Math.random() * 0.4,
        valence: 0.2 + Math.random() * 0.6,
        acousticness: 0.1,
        instrumentalness: 0.5,
      };
      return { id, ...info };
    });
  }
}
