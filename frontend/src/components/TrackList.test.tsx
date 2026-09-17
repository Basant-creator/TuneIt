import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackList, VIRTUALIZE_THRESHOLD } from './TrackList';
import type { FlowTrack } from '@/types/flow';

function buildTracks(count: number): FlowTrack[] {
  return Array.from({ length: count }, (_, i) => ({
    videoId: `vid_${i}`,
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    estimatedBpm: 100 + (i % 40),
    intensityScore: Number(((i % 10) / 10).toFixed(2)),
    displayIndex: i + 1,
    segment: i % 3 === 0 ? 'ACT_I' : undefined,
  }));
}

beforeEach(() => {
  // jsdom reports every element as 0x0, which would make the virtualizer render
  // nothing. Give the scroll container a realistic viewport.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    const isScroller = this.getAttribute('data-testid') === 'track-list-virtual';
    return {
      width: 600,
      height: isScroller ? 600 : 68,
      top: 0,
      left: 0,
      bottom: isScroller ? 600 : 68,
      right: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect;
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.getAttribute('data-testid') === 'track-list-virtual' ? 600 : 68;
    },
  });
});

describe('TrackList rendering strategy', () => {
  it('uses the animated list at or below the threshold', () => {
    render(
      <TrackList tracks={buildTracks(VIRTUALIZE_THRESHOLD)} variant="optimized" onPreview={() => {}} />
    );

    expect(screen.getByTestId('track-list-animated')).toBeInTheDocument();
    expect(screen.queryByTestId('track-list-virtual')).not.toBeInTheDocument();
  });

  it('switches to the windowed list above the threshold', () => {
    render(
      <TrackList
        tracks={buildTracks(VIRTUALIZE_THRESHOLD + 1)}
        variant="optimized"
        onPreview={() => {}}
      />
    );

    expect(screen.getByTestId('track-list-virtual')).toBeInTheDocument();
    expect(screen.queryByTestId('track-list-animated')).not.toBeInTheDocument();
  });

  it('mounts every row on a short playlist', () => {
    render(<TrackList tracks={buildTracks(12)} variant="optimized" onPreview={() => {}} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });

  it('mounts only a window of rows for a 500-track playlist', () => {
    // The point of the change: 500 tracks must not become 500 DOM nodes.
    render(<TrackList tracks={buildTracks(500)} variant="optimized" onPreview={() => {}} />);

    const rendered = screen.getAllByRole('listitem').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(50);
  });

  it('reserves full scroll height so the scrollbar still reflects 500 tracks', () => {
    render(<TrackList tracks={buildTracks(500)} variant="optimized" onPreview={() => {}} />);

    const list = screen.getByTestId('track-list-virtual').querySelector('ul')!;
    // 500 rows at 68px + 8px gap.
    expect(parseInt(list.style.height, 10)).toBe(500 * 76);
  });
});

describe('TrackRow content', () => {
  it('shows index, title, artist and analysis values', () => {
    render(<TrackList tracks={buildTracks(3)} variant="optimized" onPreview={() => {}} />);

    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('shows engine segment labels only on the optimized view', () => {
    const optimized = render(
      <TrackList tracks={buildTracks(3)} variant="optimized" onPreview={() => {}} />
    );
    expect(screen.getByText('ACT I')).toBeInTheDocument();
    optimized.unmount();

    render(<TrackList tracks={buildTracks(3)} variant="chaotic" onPreview={() => {}} />);
    expect(screen.queryByText('ACT I')).not.toBeInTheDocument();
  });

  it('decodes HTML entities from YouTube titles', () => {
    const tracks = buildTracks(1);
    tracks[0].title = 'Me &amp; You';
    render(<TrackList tracks={tracks} variant="optimized" onPreview={() => {}} />);

    expect(screen.getByText('Me & You')).toBeInTheDocument();
  });

  it('hands the right track to the preview callback', async () => {
    const onPreview = vi.fn();
    const user = userEvent.setup();
    render(<TrackList tracks={buildTracks(3)} variant="optimized" onPreview={onPreview} />);

    await user.click(screen.getAllByTitle(/15s Snippet/i)[1]);

    expect(onPreview).toHaveBeenCalledOnce();
    expect(onPreview.mock.calls[0][0].videoId).toBe('vid_1');
  });

  it('fires the preview callback from a virtualized row too', async () => {
    const onPreview = vi.fn();
    const user = userEvent.setup();
    render(<TrackList tracks={buildTracks(200)} variant="optimized" onPreview={onPreview} />);

    await user.click(screen.getAllByTitle(/15s Snippet/i)[0]);

    expect(onPreview).toHaveBeenCalledOnce();
    expect(onPreview.mock.calls[0][0].videoId).toBe('vid_0');
  });

  it('omits the BPM block when a track has no analysis', () => {
    const tracks = buildTracks(1);
    delete tracks[0].estimatedBpm;
    render(<TrackList tracks={tracks} variant="optimized" onPreview={() => {}} />);

    expect(screen.queryByText('BPM')).not.toBeInTheDocument();
  });

  it('renders an empty list without crashing', () => {
    render(<TrackList tracks={[]} variant="optimized" onPreview={() => {}} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
