import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from './api';

/**
 * The API client is the single point where a failure becomes either "reconnect
 * your account" or "the server is down". Getting that wrong is what made the
 * old playlists page bounce everyone to the homepage, so it is worth pinning.
 */

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request plumbing', () => {
  it('sends credentials so the session cookie travels with every call', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    await api.getPlaylists();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe('include');
  });

  it('sets a JSON content type only when there is a body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ authenticated: false }));
    await api.authStatus();
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Content-Type');

    fetchMock.mockResolvedValue(jsonResponse({ tracks: [] }));
    await api.rearrange('PL1', 'bu');
    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBe('application/json');
  });

  it('percent-encodes playlist ids so slashes cannot escape the path', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ tracks: [] }));
    await api.getPlaylistTracks('PL/../admin');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('PL%2F..%2Fadmin');
    expect(url).not.toContain('PL/../admin');
  });
});

describe('error classification', () => {
  it('flags a 401 as an auth error so the UI can offer a reconnect', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Not connected', code: 'NOT_AUTHENTICATED' }, { status: 401 })
    );

    const err = await api.getProfile().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.isAuthError).toBe(true);
    expect(err.message).toBe('Not connected');
  });

  it('does not treat a server error as an auth error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, { status: 500 }));

    const err = await api.getPlaylists().catch((e) => e);
    expect(err.status).toBe(500);
    expect(err.isAuthError).toBe(false);
  });

  it('reports an unreachable backend distinctly from an HTTP error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const err = await api.getPlaylists().catch((e) => e);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/Could not reach/i);
  });

  it('keeps the payload of a 422 so rejected tracks survive the error path', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: 'Nothing retained',
          code: 'NO_TRACKS_RETAINED',
          harshTracks: [{ videoId: 'a', title: 'T', artist: 'A' }],
        },
        { status: 422 }
      )
    );

    const err = await api.rearrange('PL1', 'df').catch((e) => e);
    expect(err.code).toBe('NO_TRACKS_RETAINED');
    expect(err.payload?.harshTracks).toHaveLength(1);
  });

  it('surfaces a non-JSON error body without throwing a parse error', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>502 Bad Gateway</html>', { status: 502 })
    );

    const err = await api.getPlaylists().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
  });

  it('aborts and reports a timeout rather than hanging forever', async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    vi.useFakeTimers();
    const pending = api.authStatus();
    await vi.advanceTimersByTimeAsync(10_000);
    vi.useRealTimers();

    // authStatus swallows failures by design so the header can render.
    await expect(pending).resolves.toEqual({ authenticated: false });
  });
});

describe('response shaping', () => {
  it('unwraps playlists and tolerates a missing items array', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(api.getPlaylists()).resolves.toEqual([]);

    fetchMock.mockResolvedValue(jsonResponse({ items: [{ id: 'PL1', name: 'Mix' }] }));
    await expect(api.getPlaylists()).resolves.toHaveLength(1);
  });

  it('never throws from authStatus, so the header always renders', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.authStatus()).resolves.toEqual({ authenticated: false });
  });

  it('posts the selected mode to the mode-agnostic endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ tracks: [], harshTracks: [] }));
    await api.rearrange('PL9', 'ph');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/playlists/PL9/rearrange');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ mode: 'ph' });
  });
});
