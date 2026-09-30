import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Header } from './Header';
import { api } from '@/services/api';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const profile = { id: 'UC123', display_name: 'Sam', email: 'Authenticated Session', images: [] };

/**
 * Sign-in is temporary (Google online access, about an hour), and the header
 * is the only place to end it early. Signing out must revoke it and leave.
 */
describe('Header sign out', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
  });

  it('offers sign out to a signed-in visitor', () => {
    render(<Header userProfile={profile} showNavLinks={false} />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('offers no sign out to a signed-out visitor', () => {
    render(<Header />);
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /connect/i })).toHaveAttribute('href', api.loginUrl());
  });

  it('calls the backend logout, then goes home', async () => {
    const logout = vi.spyOn(api, 'logout').mockResolvedValue({ message: 'Signed out' });
    render(<Header userProfile={profile} showNavLinks={false} />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('still leaves when the logout request fails', async () => {
    vi.spyOn(api, 'logout').mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Header userProfile={profile} showNavLinks={false} />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });
});
