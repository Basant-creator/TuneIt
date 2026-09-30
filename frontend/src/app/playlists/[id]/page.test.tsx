import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlaylistModifierPage from './page';
import { api, ApiError } from '@/services/api';
import { loadDraft, saveDraft, sourceIdsOf } from '@/utils/sequenceDraft';
import type { FlowEngineResponse, FlowTrack } from '@/types/flow';

/**
 * Sign-in lasts about an hour. Reconnecting is a round trip through Google,
 * and it must not cost the visitor a sequence they arranged but had not yet
 * exported.
 */

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'PL1' }),
  useRouter: () => ({ push, replace }),
}));

const track = (videoId: string, title: string, intensityScore: number): FlowTrack =>
  ({ videoId, title, artist: 'Artist', estimatedBpm: 120, intensityScore }) as FlowTrack;

const PLAYLIST = [track('a', 'Alpha', 0.8), track('b', 'Bravo', 0.2), track('c', 'Charlie', 0.5)];
const ENGINE_ORDER = [PLAYLIST[1], PLAYLIST[2], PLAYLIST[0]];

const engineResult = {
  engine: 'RISE',
  mode: 'bu',
  label: 'Rise',
  message: '',
  originalCount: 3,
  acceptedCount: 3,
  filteredCount: 0,
  smoothnessScore: 70,
  metrics: { smoothnessScore: 70, meanDeltaEnergy: 0.3, maxDeltaEnergy: 0.3, jarringCount: 0, meanBpmDelta: 0, energySlope: 0.3, energyCurve: [0.2, 0.5, 0.8] },
  engineMetrics: {},
  tracks: ENGINE_ORDER,
  harshTracks: [],
} as unknown as FlowEngineResponse;

/** Titles in the order the visible track list shows them. */
const shownTitles = () =>
  [...document.querySelectorAll('[data-testid^="track-list"] h4')].map((h) => h.textContent);

beforeEach(() => {
  vi.spyOn(api, 'getPlaylistTracks').mockResolvedValue(PLAYLIST);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  push.mockReset();
  replace.mockReset();
});

describe('playlist page keeps the arranged sequence across a reconnect', () => {
  it('puts back a sequence arranged earlier in this tab', async () => {
    // Engine order, then the visitor dragged Alpha to the top.
    const arranged = [PLAYLIST[0], PLAYLIST[1], PLAYLIST[2]].map((t, i) => ({ ...t, displayIndex: i + 1 }));
    saveDraft({
      playlistId: 'PL1',
      mode: 'bu',
      flowResult: engineResult,
      tracks: arranged,
      harshTracks: [],
      manuallyReordered: true,
      exportTitle: 'Night drive',
      sourceIds: sourceIdsOf(PLAYLIST),
    });

    render(<PlaylistModifierPage />);

    expect(await screen.findByText(/Picked up where you left off/)).toBeInTheDocument();
    expect(shownTitles()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('forgets the saved sequence when the visitor starts over', async () => {
    saveDraft({
      playlistId: 'PL1',
      mode: 'bu',
      flowResult: engineResult,
      tracks: ENGINE_ORDER,
      harshTracks: [],
      manuallyReordered: false,
      exportTitle: 'x',
      sourceIds: sourceIdsOf(PLAYLIST),
    });
    render(<PlaylistModifierPage />);

    fireEvent.click(await screen.findByRole('button', { name: /start over/i }));

    expect(loadDraft('PL1')).toBeNull();
    expect(screen.queryByText(/Picked up where you left off/)).not.toBeInTheDocument();
    expect(shownTitles()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('drops the saved sequence if the playlist changed on YouTube since', async () => {
    saveDraft({
      playlistId: 'PL1',
      mode: 'bu',
      flowResult: engineResult,
      tracks: ENGINE_ORDER,
      harshTracks: [],
      manuallyReordered: false,
      exportTitle: 'x',
      sourceIds: ['a', 'b', 'c', 'd'],
    });

    render(<PlaylistModifierPage />);

    expect(await screen.findByText(/changed on YouTube since you arranged it/)).toBeInTheDocument();
    expect(screen.queryByText(/Picked up where you left off/)).not.toBeInTheDocument();
    expect(loadDraft('PL1')).toBeNull();
  });

  it('saves the sequence once the engine has arranged it', async () => {
    vi.spyOn(api, 'rearrange').mockResolvedValue(engineResult);
    render(<PlaylistModifierPage />);

    fireEvent.click(await screen.findByRole('button', { name: /apply rise flow/i }));

    await waitFor(() => expect(loadDraft('PL1')).not.toBeNull(), { timeout: 2000 });
    const saved = loadDraft('PL1')!;
    expect(saved.tracks.map((t) => t.videoId)).toEqual(['b', 'c', 'a']);
    expect(saved.sourceIds).toEqual(['a', 'b', 'c']);
  });

  it('offers a reconnect that comes back to this playlist when the sign-in has ended', async () => {
    vi.spyOn(api, 'getPlaylistTracks').mockRejectedValue(new ApiError('Not connected', 401, 'NOT_AUTHENTICATED'));
    render(<PlaylistModifierPage />);

    const reconnect = await screen.findByRole('link', { name: /reconnect youtube music/i });
    expect(reconnect).toHaveAttribute('href', api.loginUrl());
    reconnect.addEventListener('click', (e) => e.preventDefault()); // jsdom cannot navigate
    fireEvent.click(reconnect);
    expect(JSON.parse(sessionStorage.getItem('tuneit:resume')!).playlistId).toBe('PL1');
  });
});
