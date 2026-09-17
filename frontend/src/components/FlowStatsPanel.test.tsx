import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlowStatsPanel } from './FlowStatsPanel';
import type { FlowEngineResponse } from '@/types/flow';

function buildResult(overrides: Partial<FlowEngineResponse> = {}): FlowEngineResponse {
  return {
    engine: 'DRIFT',
    mode: 'df',
    label: 'Drift',
    message: 'ok',
    originalCount: 80,
    acceptedCount: 22,
    filteredCount: 58,
    smoothnessScore: 88.86,
    metrics: {
      smoothnessScore: 88.86,
      meanDeltaEnergy: 0.1114,
      maxDeltaEnergy: 0.41,
      jarringCount: 1,
      meanBpmDelta: 12.4,
      energySlope: 0.0031,
      energyCurve: [],
    },
    engineMetrics: {},
    tracks: [],
    harshTracks: [],
    ...overrides,
  };
}

describe('FlowStatsPanel', () => {
  it('shows retention as a fraction and a percentage', () => {
    // Drift deliberately filters hard. Users seeing 22 of 80 tracks need to be
    // told that is retention, not a failure.
    render(<FlowStatsPanel result={buildResult()} />);

    expect(screen.getByText('22/80')).toBeInTheDocument();
    expect(screen.getByText(/28% retention/)).toBeInTheDocument();
    expect(screen.getByText(/58 filtered/)).toBeInTheDocument();
  });

  it('omits the filtered note when nothing was dropped', () => {
    render(
      <FlowStatsPanel
        result={buildResult({ acceptedCount: 80, filteredCount: 0 })}
      />
    );

    expect(screen.getByText(/100% retention/)).toBeInTheDocument();
    expect(screen.queryByText(/filtered/)).not.toBeInTheDocument();
  });

  it('renders the flow score to one decimal', () => {
    render(<FlowStatsPanel result={buildResult()} />);
    expect(screen.getByText('88.9')).toBeInTheDocument();
  });

  it.each([
    [0.0031, 'Builds upward'],
    [-0.0042, 'Winds down'],
    [0.0005, 'Holds steady'],
    [0, 'Holds steady'],
  ])('describes an energy slope of %s as "%s"', (energySlope, expected) => {
    render(
      <FlowStatsPanel
        result={buildResult({
          metrics: { ...buildResult().metrics, energySlope },
        })}
      />
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('reports the jarring-jump count', () => {
    render(
      <FlowStatsPanel
        result={buildResult({ metrics: { ...buildResult().metrics, jarringCount: 0 } })}
      />
    );
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/energy leaps above 0.35/)).toBeInTheDocument();
  });

  it('does not divide by zero on an empty playlist', () => {
    render(
      <FlowStatsPanel
        result={buildResult({ originalCount: 0, acceptedCount: 0, filteredCount: 0 })}
      />
    );
    expect(screen.getByText(/100% retention/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
