import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FlowSandbox } from './FlowSandbox';
import { DEFAULT_SANDBOX_PICKS } from '@/data/homeData';
import { PRESET_TRACKS } from '@/data/presetTracks';
import { getEngineRun, scoreSelection } from '@/utils/sandboxMetrics';

/**
 * The sandbox on each mode card must show what the real engine does: its
 * order, its role for each track, what it set aside and why, and bars computed
 * from its output.
 */

type Mode = keyof typeof DEFAULT_SANDBOX_PICKS;
const nameOf = (id: string) => PRESET_TRACKS.find((t) => t.id === id)!.name;

function renderMode(mode: Mode, ids = DEFAULT_SANDBOX_PICKS[mode]) {
  return render(<FlowSandbox modeId={mode} selectedTrackIds={ids} onChangeSelected={() => {}} />);
}

/** Reads each bar as { name: value }, where value is "93%" or "—". */
function bars(container: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  container.querySelectorAll('[data-bar]').forEach((row) => {
    const name = row.querySelector('span')?.textContent?.trim() ?? '';
    const value = row.querySelector('[data-value] > span')?.textContent?.trim() ?? '';
    out[name] = value;
  });
  return out;
}

describe('FlowSandbox shows the real engine run', () => {
  it.each(['bu', 'df', 'ph', 'cm'] as Mode[])('%s lists tracks in the engine order', (mode) => {
    const { container } = renderMode(mode);
    const run = getEngineRun(DEFAULT_SANDBOX_PICKS[mode])!;
    const shown = [...container.querySelectorAll('p.font-black.truncate')].map((p) => p.textContent);
    expect(shown).toEqual(run.order.map((o) => nameOf(o.id)));
  });

  it.each(['bu', 'df', 'ph', 'cm'] as Mode[])('%s renders its checks and two bars with no broken values', (mode) => {
    const { container } = renderMode(mode);
    const s = scoreSelection(mode, DEFAULT_SANDBOX_PICKS[mode])!;
    expect(container.querySelectorAll('[data-check]')).toHaveLength(s.checks.length);
    const values = Object.values(bars(container));
    expect(values).toHaveLength(2);
    for (const v of values) expect(v).toMatch(/^(\d{1,3}%|—)$/);
    expect(container.textContent).not.toMatch(/null%|NaN|undefined|Infinity/);
  });

  it('shows each bar next to its shuffled baseline', () => {
    const { container } = renderMode('bu');
    const s = scoreSelection('bu', DEFAULT_SANDBOX_PICKS.bu)!;
    for (const b of s.bars) {
      const row = container.querySelector(`[data-bar="${b.id}"]`)!;
      expect(row.textContent).toContain(`shuffled ${b.shuffled}%`);
    }
  });

  it('counts the checks passed in the header', () => {
    renderMode('cm');
    const s = scoreSelection('cm', DEFAULT_SANDBOX_PICKS.cm)!;
    expect(screen.getByText(`Checks ${s.passed}/${s.applicable}`)).toBeInTheDocument();
  });

  it('shows a failed check as failed', () => {
    const ids = PRESET_TRACKS.filter((t) => t.category === 'bu').map((t) => t.id);
    const failing = combos(ids).find((c) => getEngineRun(c)!.checks['no-jarring'][0] === false)!;
    const { container } = renderMode('bu', failing);
    const row = container.querySelector('[data-check="no-jarring"]')!;
    expect(within(row as HTMLElement).getByLabelText('Failed')).toBeInTheDocument();
  });

  it('marks the Unhinged curveball the engine threw', () => {
    renderMode('ph');
    expect(screen.getAllByText('Curveball').length).toBeGreaterThan(0);
    expect(screen.getByText(/Curveball on track \d/)).toBeInTheDocument();
  });

  it('lists what Drift set aside, with the engine reason', () => {
    const run = getEngineRun(DEFAULT_SANDBOX_PICKS.df)!;
    expect(run.excluded.length).toBeGreaterThan(0);
    renderMode('df');
    // Scope to the panel: Drift's picks include two different songs named "Intro".
    const panel = screen.getByText(/Set aside by the engine/i).parentElement!;
    for (const x of run.excluded) {
      expect(within(panel).getAllByText(nameOf(x.id)).length).toBeGreaterThan(0);
    }
    expect(within(panel).getAllByText(new RegExp(run.excluded[0].reason)).length).toBe(run.excluded.length);
  });

  it('shows a check that does not apply as neither passed nor failed', () => {
    // An Unhinged selection with no swing: there is nothing to anchor.
    const ids = PRESET_TRACKS.filter((t) => t.category === 'ph').map((t) => t.id);
    const quiet = combos(ids).find((c) => getEngineRun(c)!.checks.anchored[0] === null);
    if (!quiet) return; // Every selection swings; nothing to test.
    const { container } = renderMode('ph', quiet);
    const row = container.querySelector('[data-check="anchored"]')!;
    expect(within(row as HTMLElement).getByLabelText('Does not apply')).toBeInTheDocument();
  });

  it('flags the tricky presets', () => {
    renderMode('bu');
    expect(screen.getAllByText(/Tricky ·/).length).toBe(PRESET_TRACKS.filter((t) => t.category === 'bu' && t.awkward).length);
  });

  it('asks for more tracks until five are chosen', () => {
    renderMode('bu', ['r1', 'r2']);
    expect(screen.getByText(/Choose 3 more/)).toBeInTheDocument();
  });
});

function combos(ids: string[]): string[][] {
  const out: string[][] = [];
  const pick = (from: number, chosen: string[]) => {
    if (chosen.length === 5) return void out.push(chosen);
    for (let i = from; i < ids.length; i++) pick(i + 1, [...chosen, ids[i]]);
  };
  pick(0, []);
  return out;
}

describe('FlowSandbox text colour', () => {
  it("sets its own text colour instead of inheriting a section's white", () => {
    // Rise and Unhinged sit in `text-white` sections. Without an explicit
    // colour, the title rendered white on white and selected track names
    // white on yellow.
    const { container } = render(
      <div className="text-white">
        <FlowSandbox modeId="ph" selectedTrackIds={DEFAULT_SANDBOX_PICKS.ph} onChangeSelected={() => {}} />
      </div>
    );
    const root = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(root).toHaveClass('text-black');
    expect(within(root).getByText(/build your mix/i)).toBeInTheDocument();
  });
});
