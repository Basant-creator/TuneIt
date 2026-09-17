/**
 * Session Store (src/services/sessionStore.ts)
 *
 * Maps an opaque session id (handed to the browser in an httpOnly cookie) to
 * that visitor's YtMusicService instance, so two people using the deployment at
 * the same time never see each other's YouTube account.
 *
 * NOTE: this is process-local. It is correct for a single backend instance, and
 * sessions are lost on restart. Running more than one replica requires moving
 * this map to Redis or the database — see DEPLOYMENT.md.
 */

import crypto from 'crypto';
import { YtMusicService } from './ytmusicService';

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const SWEEP_INTERVAL_MS = 1000 * 60 * 15; // 15 minutes

interface SessionRecord {
  service: YtMusicService;
  createdAt: number;
  lastUsedAt: number;
}

const sessions = new Map<string, SessionRecord>();

export function createSessionId(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Returns the service bound to `sessionId`, creating an empty (unauthenticated)
 * one when the session is new. Returns null when no session id is supplied.
 */
export function getSessionService(sessionId: string | undefined): YtMusicService | null {
  if (!sessionId) return null;

  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing.service;
  }
  return null;
}

/** Creates (or resets) the service for a session id. */
export function initSession(sessionId: string): YtMusicService {
  const service = new YtMusicService();
  const now = Date.now();
  sessions.set(sessionId, { service, createdAt: now, lastUsedAt: now });
  return service;
}

export function destroySession(sessionId: string | undefined): void {
  if (sessionId) sessions.delete(sessionId);
}

export function activeSessionCount(): number {
  return sessions.size;
}

/** Drops sessions that have been idle past the TTL. */
export function sweepExpiredSessions(now: number = Date.now()): number {
  let removed = 0;
  for (const [id, record] of sessions) {
    if (now - record.lastUsedAt > SESSION_TTL_MS) {
      sessions.delete(id);
      removed++;
    }
  }
  return removed;
}

const sweepTimer = setInterval(() => {
  const removed = sweepExpiredSessions();
  if (removed > 0) {
    console.log(`[SessionStore] Swept ${removed} expired session(s).`);
  }
}, SWEEP_INTERVAL_MS);

// Never hold the event loop open just for the sweeper.
sweepTimer.unref?.();
