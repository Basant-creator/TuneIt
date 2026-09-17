import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AudioPreviewModal } from './AudioPreviewModal';

// The modal fetches a preview URL from iTunes on open; stub it so these tests
// stay offline and deterministic.
vi.mock('@/utils/audioPreview', () => ({
  getAudioPreviewUrl: vi.fn(),
}));

import { getAudioPreviewUrl } from '@/utils/audioPreview';

/** Renders and lets the preview-URL effect settle, so no state update escapes act(). */
async function renderModal(track: Parameters<typeof AudioPreviewModal>[0]['track']) {
  const result = render(<AudioPreviewModal track={track} isOpen onClose={() => {}} />);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

const baseTrack = {
  videoId: 'abc123',
  title: 'Resonance',
  artist: 'HOME',
};

beforeEach(() => {
  // The shared setup calls restoreAllMocks after each test, which drops the
  // implementation, so it is re-applied here rather than in the mock factory.
  vi.mocked(getAudioPreviewUrl).mockResolvedValue(null);
});

describe('AudioPreviewModal', () => {
  it('renders nothing when closed', async () => {
    const { container } = render(
      <AudioPreviewModal track={baseTrack} isOpen={false} onClose={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing without a track', async () => {
    const { container } = await renderModal(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a real AI review when the track carries one', async () => {
    await renderModal({ ...baseTrack, vibeReview: 'Dreamy synthwave with floating pads.' });

    expect(screen.getByText('AI Song Review')).toBeInTheDocument();
    expect(screen.getByText(/Dreamy synthwave with floating pads/)).toBeInTheDocument();
  });

  it('never invents a review for a track that has none', async () => {
    // Regression: the modal used to fall back to a hardcoded
    // "...driving 122 BPM rhythmic progression" for every sequenced track,
    // presenting fabricated text as per-song analysis.
    await renderModal({ ...baseTrack, estimatedBpm: 90, intensityScore: 0.18 });

    expect(screen.queryByText(/driving 122 BPM/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vibrant synth pads/i)).not.toBeInTheDocument();
    expect(screen.queryByText('AI Song Review')).not.toBeInTheDocument();
  });

  it('shows the measured values instead, with a plain-language band', async () => {
    await renderModal({ ...baseTrack, estimatedBpm: 90, intensityScore: 0.18 });

    expect(screen.getByText('Track Analysis')).toBeInTheDocument();
    expect(screen.getByText('90 BPM')).toBeInTheDocument();
    expect(screen.getByText('Intensity 0.18')).toBeInTheDocument();
    expect(screen.getByText('ambient / low-key')).toBeInTheDocument();
  });

  it.each([
    [0.18, 'ambient / low-key'],
    [0.5, 'mid-energy groove'],
    [0.85, 'high-intensity'],
  ])('maps intensity %s to "%s"', async (intensityScore, label) => {
    await renderModal({ ...baseTrack, intensityScore });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('says so plainly when there is no analysis at all', async () => {
    await renderModal(baseTrack);
    expect(screen.getByText(/No analysis available/i)).toBeInTheDocument();
  });

  it('decodes HTML entities in the title', async () => {
    await renderModal({ ...baseTrack, title: 'Rock &amp; Roll' });
    expect(screen.getByText(/Rock & Roll/)).toBeInTheDocument();
  });
});
