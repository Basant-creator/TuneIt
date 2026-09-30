import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnergyGraph } from './EnergyGraph';
import { chaoticTracks, optimizedTracks } from '@/data/homeData';

/**
 * The graph used to be a hard-coded illustration — eight invented points
 * labelled "Crash", "Silence" and "Peak Peak!" beside a four-track list. It now
 * plots the tracks it is given, and these tests hold it to that.
 */

const toGraph = (tracks: typeof chaoticTracks) =>
  tracks.map((t) => ({ id: t.id, name: t.name, energy: t.energy }));

describe('EnergyGraph', () => {
  it('plots one labelled point per track', () => {
    render(<EnergyGraph tracks={toGraph(chaoticTracks)} domainTracks={toGraph(chaoticTracks)} />);
    for (const t of chaoticTracks) {
      expect(screen.getByLabelText(new RegExp(`${t.name}, energy ${t.energy.toFixed(2)}`))).toBeInTheDocument();
    }
  });

  it('shows the computed flow score, not a hard-coded one', () => {
    const { unmount } = render(
      <EnergyGraph tracks={toGraph(chaoticTracks)} domainTracks={toGraph(chaoticTracks)} activeMode="chaotic" />
    );
    expect(screen.getByText('Flow 85')).toBeInTheDocument();
    unmount();

    render(
      <EnergyGraph tracks={toGraph(optimizedTracks)} domainTracks={toGraph(chaoticTracks)} activeMode="optimized" />
    );
    expect(screen.getByText('Flow 89.7')).toBeInTheDocument();
  });

  it('counts the drops in the chaotic order', () => {
    // 0.72 -> 0.58 is the only step down in the chaotic order.
    render(
      <EnergyGraph tracks={toGraph(chaoticTracks)} domainTracks={toGraph(chaoticTracks)} activeMode="chaotic" />
    );
    expect(screen.getByText(/1 drop, biggest jump 0\.26/)).toBeInTheDocument();
  });

  it('recognises a clean climb', () => {
    render(
      <EnergyGraph tracks={toGraph(optimizedTracks)} domainTracks={toGraph(chaoticTracks)} activeMode="optimized" />
    );
    expect(screen.getByText('Climbs the whole way up')).toBeInTheDocument();
  });

  it('never renders the invented placeholder labels', () => {
    render(<EnergyGraph tracks={toGraph(chaoticTracks)} domainTracks={toGraph(chaoticTracks)} />);
    for (const fake of ['Peak Peak', 'Crash', 'Silence', 'Fatigue', 'Extreme Spike']) {
      expect(screen.queryByText(new RegExp(fake))).not.toBeInTheDocument();
    }
  });

  it('describes itself to screen readers', () => {
    render(<EnergyGraph tracks={toGraph(chaoticTracks)} domainTracks={toGraph(chaoticTracks)} />);
    expect(screen.getByRole('img', { name: /Energy across 4 tracks\. Flow score 85, 1 energy drop\./ })).toBeInTheDocument();
  });
});
