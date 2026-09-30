import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearDraft,
  draftMatchesPlaylist,
  DRAFT_MAX_AGE_MS,
  loadDraft,
  RESUME_MAX_AGE_MS,
  saveDraft,
  setResumeTarget,
  sourceIdsOf,
  takeResumeTarget,
} from './sequenceDraft';
import type { FlowEngineResponse, FlowTrack } from '@/types/flow';

const track = (videoId: string): FlowTrack => ({ videoId, title: videoId, artist: 'A' }) as FlowTrack;
const playlist = [track('a'), track('b'), track('c')];

function draft(overrides: Record<string, unknown> = {}) {
  return {
    playlistId: 'PL1',
    mode: 'bu' as const,
    flowResult: { mode: 'bu', tracks: [track('c'), track('a'), track('b')] } as unknown as FlowEngineResponse,
    tracks: [track('c'), track('b'), track('a')],
    harshTracks: [],
    manuallyReordered: true,
    exportTitle: 'Late night',
    sourceIds: sourceIdsOf(playlist),
    ...overrides,
  };
}

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('sequence drafts', () => {
  it('round-trips the arranged sequence', () => {
    saveDraft(draft());
    const back = loadDraft('PL1')!;
    expect(back.tracks.map((t) => t.videoId)).toEqual(['c', 'b', 'a']);
    expect(back.manuallyReordered).toBe(true);
    expect(back.exportTitle).toBe('Late night');
  });

  it('keeps drafts per playlist', () => {
    saveDraft(draft());
    expect(loadDraft('PL2')).toBeNull();
  });

  it('lives in sessionStorage only, never localStorage', () => {
    saveDraft(draft());
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(1);
  });

  it('drops a draft older than its limit', () => {
    const then = Date.now();
    saveDraft(draft(), then);
    expect(loadDraft('PL1', then + DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('drops a corrupt or foreign draft instead of crashing', () => {
    sessionStorage.setItem('tuneit:draft:PL1', '{not json');
    expect(loadDraft('PL1')).toBeNull();
    sessionStorage.setItem('tuneit:draft:PL1', JSON.stringify({ v: 99, playlistId: 'PL1' }));
    expect(loadDraft('PL1')).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('clears a draft', () => {
    saveDraft(draft());
    clearDraft('PL1');
    expect(loadDraft('PL1')).toBeNull();
  });

  it('matches only the same set of tracks, in any order', () => {
    const d = loadDraftAfterSave();
    expect(draftMatchesPlaylist(d, [track('b'), track('c'), track('a')])).toBe(true);
    expect(draftMatchesPlaylist(d, [track('a'), track('b')])).toBe(false);
    expect(draftMatchesPlaylist(d, [track('a'), track('b'), track('z')])).toBe(false);
  });

  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => saveDraft(draft())).not.toThrow();
    expect(loadDraft('PL1')).toBeNull();
    expect(() => setResumeTarget('PL1')).not.toThrow();
    expect(takeResumeTarget()).toBeNull();
  });
});

describe('resume target', () => {
  it('is read once', () => {
    setResumeTarget('PL1');
    expect(takeResumeTarget()).toBe('PL1');
    expect(takeResumeTarget()).toBeNull();
  });

  it('expires', () => {
    const then = Date.now();
    setResumeTarget('PL1', then);
    expect(takeResumeTarget(then + RESUME_MAX_AGE_MS + 1)).toBeNull();
  });

  it.each(['../admin', '//evil.example.com', 'PL1?x=1', 'a b', ''])('refuses %j as a redirect target', (id) => {
    sessionStorage.setItem('tuneit:resume', JSON.stringify({ playlistId: id, at: Date.now() }));
    expect(takeResumeTarget()).toBeNull();
  });
});

function loadDraftAfterSave() {
  saveDraft(draft());
  return loadDraft('PL1')!;
}
