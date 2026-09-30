/**
 * Sequence drafts (src/utils/sequenceDraft.ts)
 *
 * Sign-in is temporary: Google's online access lasts about an hour, then the
 * visitor reconnects. Reconnecting is a full-page round trip through Google,
 * which used to throw away a sequence the visitor had arranged but not yet
 * exported. This keeps that sequence in the tab's sessionStorage so the
 * playlist page can put it back.
 *
 * sessionStorage, not localStorage: it belongs to this tab only and is gone
 * when the tab closes, in keeping with "nothing about your account is saved".
 * It holds track metadata and the engine result — never a token. Every access
 * is wrapped, because storage can be unavailable (private mode, blocked site
 * data, quota) and the page must work without it.
 */

import type { FlowEngineResponse, FlowMode, FlowTrack } from '@/types/flow';

const DRAFT_PREFIX = 'tuneit:draft:';
const RESUME_KEY = 'tuneit:resume';
const VERSION = 1;

/** A draft older than this is dropped; the sign-in it outlived is long gone. */
export const DRAFT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
/** Only resume if the visitor comes back from Google reasonably soon. */
export const RESUME_MAX_AGE_MS = 30 * 60 * 1000;

export interface SequenceDraft {
  v: typeof VERSION;
  playlistId: string;
  savedAt: number;
  mode: FlowMode;
  flowResult: FlowEngineResponse;
  /** The order on screen: the engine's, plus any manual moves and additions. */
  tracks: FlowTrack[];
  harshTracks: FlowTrack[];
  manuallyReordered: boolean;
  exportTitle: string;
  /** The playlist's track ids when it was arranged, to detect later edits. */
  sourceIds: string[];
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const sortedIds = (tracks: Array<{ videoId: string }>) => tracks.map((t) => t.videoId).sort();

export function saveDraft(draft: Omit<SequenceDraft, 'v' | 'savedAt'>, now: number = Date.now()): void {
  try {
    storage()?.setItem(DRAFT_PREFIX + draft.playlistId, JSON.stringify({ ...draft, v: VERSION, savedAt: now }));
  } catch {
    // Quota or blocked storage: the sequence just won't survive a reconnect.
  }
}

export function loadDraft(playlistId: string, now: number = Date.now()): SequenceDraft | null {
  try {
    const raw = storage()?.getItem(DRAFT_PREFIX + playlistId);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SequenceDraft;
    const valid =
      draft?.v === VERSION &&
      draft.playlistId === playlistId &&
      typeof draft.savedAt === 'number' &&
      now - draft.savedAt <= DRAFT_MAX_AGE_MS &&
      Array.isArray(draft.tracks) &&
      Array.isArray(draft.sourceIds) &&
      !!draft.flowResult;
    if (!valid) {
      clearDraft(playlistId);
      return null;
    }
    return draft;
  } catch {
    clearDraft(playlistId);
    return null;
  }
}

export function clearDraft(playlistId: string): void {
  try {
    storage()?.removeItem(DRAFT_PREFIX + playlistId);
  } catch {
    /* nothing to clear */
  }
}

/** True when the playlist still holds exactly the tracks it was arranged from. */
export function draftMatchesPlaylist(draft: SequenceDraft, playlistTracks: Array<{ videoId: string }>): boolean {
  const now = sortedIds(playlistTracks);
  const then = [...draft.sourceIds].sort();
  return now.length === then.length && now.every((id, i) => id === then[i]);
}

export function sourceIdsOf(playlistTracks: Array<{ videoId: string }>): string[] {
  return sortedIds(playlistTracks);
}

/** Remembers which playlist to return to after reconnecting at Google. */
export function setResumeTarget(playlistId: string, now: number = Date.now()): void {
  try {
    storage()?.setItem(RESUME_KEY, JSON.stringify({ playlistId, at: now }));
  } catch {
    /* the visitor lands on the playlist list instead */
  }
}

/** Reads and clears the resume target; null if absent, stale or malformed. */
export function takeResumeTarget(now: number = Date.now()): string | null {
  try {
    const s = storage();
    const raw = s?.getItem(RESUME_KEY);
    s?.removeItem(RESUME_KEY);
    if (!raw) return null;
    const { playlistId, at } = JSON.parse(raw) as { playlistId?: unknown; at?: unknown };
    if (typeof playlistId !== 'string' || typeof at !== 'number') return null;
    // Playlist ids are URL-safe tokens; anything else could steer the redirect.
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(playlistId)) return null;
    if (now - at > RESUME_MAX_AGE_MS) return null;
    return playlistId;
  } catch {
    return null;
  }
}
