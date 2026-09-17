/**
 * TuneIt API client (src/services/api.ts)
 *
 * One place that knows how to talk to the backend. Every call sends
 * `credentials: 'include'` so the httpOnly session cookie travels with it —
 * without that, the backend cannot tell two visitors apart.
 */

import { env } from '@/lib/env';
import type {
  ExportResult,
  FlowEngineResponse,
  FlowMode,
  FlowTrack,
  Playlist,
  RecommendedTrack,
  UserProfile,
} from '@/types/flow';

/** Error carrying the HTTP status and the backend's machine-readable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly payload?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, payload?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }

  /** True when the user simply needs to (re)connect their YouTube account. */
  get isAuthError(): boolean {
    return this.status === 401 || this.code === 'NOT_AUTHENTICATED';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Abort the request after this many ms. Engine runs need a long budget. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
/** Sequencing a large playlist fans out to YouTube + Gemini, so allow longer. */
const ENGINE_TIMEOUT_MS = 180_000;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...rest,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 408, 'TIMEOUT');
    }
    throw new ApiError(
      'Could not reach the TuneIt server. Check that the backend is running.',
      0,
      'NETWORK_ERROR'
    );
  }
  clearTimeout(timer);

  // 204 and friends have no body to parse.
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError(`Server returned ${response.status}`, response.status);
      }
    }
  }

  if (!response.ok) {
    throw new ApiError(
      (data.error as string) || `Request failed with status ${response.status}`,
      response.status,
      data.code as string | undefined,
      data
    );
  }

  return data as T;
}

export const api = {
  /** Cheap, never-401s check used to decide what to render. */
  async authStatus(): Promise<{ authenticated: boolean }> {
    try {
      return await request<{ authenticated: boolean }>('/auth/status', { timeoutMs: 8000 });
    } catch {
      return { authenticated: false };
    }
  },

  loginUrl(): string {
    return `${env.apiUrl}/auth/login`;
  },

  logout(): Promise<{ message: string }> {
    return request('/auth/logout', { method: 'POST' });
  },

  getProfile(): Promise<UserProfile> {
    return request<UserProfile>('/api/me');
  },

  async getPlaylists(): Promise<Playlist[]> {
    const data = await request<{ items?: Playlist[] }>('/api/playlists');
    return data.items ?? [];
  },

  async getPlaylistTracks(playlistId: string): Promise<FlowTrack[]> {
    const data = await request<{ tracks?: FlowTrack[] }>(
      `/api/playlists/${encodeURIComponent(playlistId)}/tracks`,
      { timeoutMs: 60_000 }
    );
    return data.tracks ?? [];
  },

  /** Runs any of the four engines through the mode-agnostic endpoint. */
  rearrange(playlistId: string, mode: FlowMode): Promise<FlowEngineResponse> {
    return request<FlowEngineResponse>(
      `/api/playlists/${encodeURIComponent(playlistId)}/rearrange`,
      { method: 'POST', body: { mode }, timeoutMs: ENGINE_TIMEOUT_MS }
    );
  },

  async getRecommendations(playlistId: string): Promise<RecommendedTrack[]> {
    const data = await request<{ recommendations?: RecommendedTrack[] }>(
      `/api/playlists/${encodeURIComponent(playlistId)}/recommendations`,
      { timeoutMs: 120_000 }
    );
    return data.recommendations ?? [];
  },

  exportPlaylist(input: {
    title: string;
    videoIds: string[];
    description?: string;
  }): Promise<ExportResult> {
    return request<ExportResult>('/api/playlists/export', {
      method: 'POST',
      body: input,
      timeoutMs: 120_000,
    });
  },
};
