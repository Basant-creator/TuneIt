export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string; width?: number; height?: number }[];
  releaseDate?: string;
}

export interface SpotifyAudioFeatures {
  id: string;
  tempo: number; // BPM
  key: number; // pitch class notation (0 = C, 1 = C♯/D♭, etc.)
  mode: number; // 0 = minor, 1 = major
  energy: number; // 0.0 to 1.0
  danceability: number; // 0.0 to 1.0
  valence: number; // 0.0 to 1.0 (musical positiveness)
  acousticness: number;
  instrumentalness: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  durationMs: number;
  previewUrl: string | null;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  audioFeatures?: SpotifyAudioFeatures; // Lazy loaded or resolved during sequencing
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  uri: string;
  images: { url: string }[];
  tracksCount: number;
  tracks?: SpotifyTrack[];
}

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  email?: string;
  images: { url: string }[];
}

export interface SpotifyAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Timestamp when it expires
}
