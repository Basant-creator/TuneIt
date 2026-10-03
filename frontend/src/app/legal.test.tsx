import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PrivacyPage from './privacy/page';
import TermsPage from './terms/page';
import { Footer } from '@/components/Footer';
import { CONTACT_EMAIL, EXTERNAL, YOUTUBE_SCOPE } from '@/data/legal';

/**
 * Google's OAuth verification and YouTube's API Services policies require
 * specific things of these pages. Losing one of them in an edit would block
 * the app from going public, so each is pinned here.
 */

// The root layout loads next/font, which only runs inside Next's compiler.
vi.mock('next/font/google', () => {
  const font = () => ({ variable: 'font' });
  return { Special_Gothic_Expanded_One: font, Azeret_Mono: font, Caveat: font };
});

const hrefs = () => [...document.querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('privacy policy', () => {
  it('links to the YouTube Terms of Service and the Google Privacy Policy', () => {
    render(<PrivacyPage />);
    expect(hrefs()).toContain(EXTERNAL.youtubeTerms);
    expect(hrefs()).toContain(EXTERNAL.googlePrivacy);
  });

  it('explains how to revoke access through Google', () => {
    render(<PrivacyPage />);
    expect(hrefs()).toContain(EXTERNAL.googlePermissions);
    expect(screen.getAllByText(/revoke/i).length).toBeGreaterThan(0);
  });

  it('names the exact permission it asks for', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(YOUTUBE_SCOPE)).toBeInTheDocument();
  });

  it('gives a contact address', () => {
    render(<PrivacyPage />);
    expect(hrefs()).toContain(`mailto:${CONTACT_EMAIL}`);
  });

  it('describes temporary sign-in, matching the backend', () => {
    // backend: access_type 'online', no refresh token, revoked on sign-out.
    render(<PrivacyPage />);
    expect(screen.getByText(/expires after about an hour, and no\s+refresh token/i)).toBeInTheDocument();
  });
});

describe('terms of service', () => {
  it('binds users to the YouTube Terms of Service', () => {
    render(<TermsPage />);
    const youtube = screen.getByRole('heading', { name: 'YouTube' }).parentElement!;
    expect(within(youtube).getByText(/you also agree to the/i)).toBeInTheDocument();
    expect(hrefs()).toContain(EXTERNAL.youtubeTerms);
  });

  it('links to the privacy policy', () => {
    render(<TermsPage />);
    expect(hrefs()).toContain('/privacy');
  });
});

describe('footer', () => {
  it('links to privacy, terms, YouTube terms and contact', () => {
    render(<Footer />);
    const nav = screen.getByRole('navigation', { name: 'Legal' });
    const links = [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/privacy', '/terms', EXTERNAL.youtubeTerms, `mailto:${CONTACT_EMAIL}`]);
  });
});

describe('Search Console ownership tag', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is added only when a verification code is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', 'abc123');
    vi.resetModules();
    const withCode = await import('./layout');
    expect(withCode.metadata.verification).toEqual({ google: 'abc123' });

    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', '');
    vi.resetModules();
    const without = await import('./layout');
    expect(without.metadata.verification).toBeUndefined();
  });
});
