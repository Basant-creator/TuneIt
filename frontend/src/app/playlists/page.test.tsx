import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PlaylistsPage from './page';
import { api } from '@/services/api';
import { setResumeTarget } from '@/utils/sequenceDraft';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

/**
 * Google's callback always lands on /playlists. After a reconnect the visitor
 * belongs back on the playlist they were arranging.
 */
describe('playlists page after a reconnect', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getProfile').mockResolvedValue({ display_name: 'Sam', images: [] });
    vi.spyOn(api, 'getPlaylists').mockResolvedValue([]);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    replace.mockReset();
  });

  it('returns to the playlist being arranged', async () => {
    vi.spyOn(api, 'authStatus').mockResolvedValue({ authenticated: true });
    setResumeTarget('PL1');
    render(<PlaylistsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/playlists/PL1'));
    expect(api.getPlaylists).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('tuneit:resume')).toBeNull();
  });

  it('shows the list as usual when there is nothing to resume', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => expect(api.getPlaylists).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not bounce a visitor who is still signed out', async () => {
    vi.spyOn(api, 'authStatus').mockResolvedValue({ authenticated: false });
    setResumeTarget('PL1');
    render(<PlaylistsPage />);
    await waitFor(() => expect(api.getPlaylists).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/pulling your playlists/i)).not.toBeInTheDocument();
  });
});
