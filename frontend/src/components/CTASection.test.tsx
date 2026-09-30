import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CTASection } from './CTASection';
import { api } from '@/services/api';

describe('CTASection', () => {
  it('sends the login CTA to the configured API, not localhost', () => {
    // Regression: this was hard-coded to http://127.0.0.1:3001/auth/login,
    // which sent every production visitor to their own machine.
    render(<CTASection />);
    const cta = screen.getByRole('link', { name: /fix my playlist/i });
    expect(cta).toHaveAttribute('href', api.loginUrl());
  });

  it('points the secondary CTA at a real section instead of nothing', () => {
    render(<CTASection />);
    expect(screen.getByRole('link', { name: /see the 4 modes/i })).toHaveAttribute('href', '#modes');
  });

  it('makes no claim the product cannot back up', () => {
    render(<CTASection />);
    // "Zero Setup Needed" was false — you connect a Google account first.
    expect(screen.queryByText(/zero setup/i)).not.toBeInTheDocument();
    // Drift does not use keys at all, and keys are only ever AI estimates.
    expect(screen.queryByText(/harmonic key/i)).not.toBeInTheDocument();
  });

  it('states the ephemeral-login guarantee', () => {
    render(<CTASection />);
    expect(screen.getByText(/your account is never stored/i)).toBeInTheDocument();
  });
});
