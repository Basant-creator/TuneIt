/**
 * Session Store (src/services/sessionStore.ts)
 *
 * Maps an opaque session id (handed to the browser in an httpOnly cookie) to
 * that visitor's YtMusicService instance, so two people using the deployment at
 * the same time never see each other's YouTube account.
 *
 * Sessions are temporary. Sign-in uses Google's online access, so a session
 * holds one access token that Google expires after about an hour, and no
 * refresh token. When the token runs out the session is dropped; nothing about
 * the account is written anywhere.
 *
 * NOTE: this is process-local. It is correct for a single backend instance, and
 * sessions are lost on restart. Running more than one replica requires moving
 * this map to Redis or the database — see DEPLOYMENT.md.
 */

import crypto from 'crypto';
import { YtMusicService } from './ytmusicService';

/** How long the session cookie lives: Google's access-token lifetime. */
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60; // 1 hour
/** A login that was started but never finished at Google. */
const PENDING_LOGIN_TTL_MS = 1000 * 60 * 15; // 15 minutes
const SWEEP_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes

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
  if (!existing) return null;
  if (existing.service.isExpired()) {
    // Google's token has run out and cannot be refreshed: signed out.
    sessions.delete(sessionId);
    return null;
  }
  existing.lastUsedAt = Date.now();
  return existing.service;
}

/** Creates (or resets) the service for a session id. */
export function initSession(sessionId: string): YtMusicService {
  const service = new YtMusicService();
  const now = Date.now();
  sessions.set(sessionId, { service, createdAt: now, lastUsedAt: now });
  return service;
}

/** Signs the session out: revokes its Google token, then forgets the session. */
export async function endSession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  const record = sessions.get(sessionId);
  sessions.delete(sessionId);
  await record?.service.signOut();
}

export function activeSessionCount(): number {
  return sessions.size;
}

/**
 * Drops sessions whose Google token has expired, and logins that were started
 * but never completed. An expired token needs no revoking.
 */
export function sweepExpiredSessions(now: number = Date.now()): number {
  let removed = 0;
  for (const [id, record] of sessions) {
    const neverSignedIn = record.service.getExpiresAt() === null;
    const stale = neverSignedIn
      ? now - record.createdAt > PENDING_LOGIN_TTL_MS
      : record.service.isExpired(now);
    if (stale) {
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
