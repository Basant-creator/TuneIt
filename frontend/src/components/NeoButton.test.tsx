import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NeoButton } from './NeoButton';

describe('NeoButton', () => {
  it('renders a real anchor, not a button inside a link, when given href', () => {
    // The login CTAs used to be <a><button/></a>: two nested interactive
    // elements, which is invalid HTML and announced twice by screen readers.
    render(<NeoButton href="/somewhere">Go</NeoButton>);

    const link = screen.getByRole('link', { name: 'Go' });
    expect(link).toHaveAttribute('href', '/somewhere');
    expect(link.querySelector('button')).toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('defaults to type="button" so it never submits a surrounding form', () => {
    render(<NeoButton>Click</NeoButton>);
    expect(screen.getByRole('button', { name: 'Click' })).toHaveAttribute('type', 'button');
  });

  it('lets an explicit type win', () => {
    render(<NeoButton type="submit">Send</NeoButton>);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<NeoButton onClick={onClick}>Press</NeoButton>);

    await user.click(screen.getByRole('button', { name: 'Press' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when asked', () => {
    render(<NeoButton disabled>Nope</NeoButton>);
    expect(screen.getByRole('button', { name: 'Nope' })).toBeDisabled();
  });

  it('carries the keyboard focus-ring hook', () => {
    render(<NeoButton>Focus me</NeoButton>);
    expect(screen.getByRole('button', { name: 'Focus me' })).toHaveClass('neo-focus');
  });
});
