/**
 * Session middleware (src/middleware/session.ts)
 *
 * Reads the TuneIt session cookie off the request and attaches the matching
 * YtMusicService. No cookie-parser dependency: the cookie header is trivial to
 * parse and the session id is an unguessable random token, so it carries its own
 * entropy rather than relying on a signing secret.
 */

import { Request, Response, NextFunction } from 'express';
import { YtMusicService } from '../services/ytmusicService';
import { getSessionService, createSessionId, initSession } from '../services/sessionStore';
import { googleConfig } from '../config/ytmusic';

export const SESSION_COOKIE = 'tuneit_sid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sessionId?: string;
      ytmusic?: YtMusicService | null;
    }
  }
}

/** Parses a raw `Cookie` header into a key/value map. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function attachSession(req: Request, _res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  req.sessionId = cookies[SESSION_COOKIE];
  req.ytmusic = getSessionService(req.sessionId);
  next();
}

/**
 * Issues a fresh session id + cookie and returns the new (unauthenticated)
 * service. Used at the start of the OAuth login redirect.
 */
export function startSession(res: Response): { sessionId: string; service: YtMusicService } {
  const sessionId = createSessionId();
  const service = initSession(sessionId);

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    // Frontend and backend are usually on different domains in production, so
    // the cookie has to be SameSite=None; that in turn requires Secure.
    sameSite: googleConfig.crossSiteCookies ? 'none' : 'lax',
    secure: googleConfig.crossSiteCookies || googleConfig.isProduction,
    maxAge: 1000 * 60 * 60 * 12,
    path: '/',
  });

  return { sessionId, service };
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: googleConfig.crossSiteCookies ? 'none' : 'lax',
    secure: googleConfig.crossSiteCookies || googleConfig.isProduction,
    path: '/',
  });
}

/**
 * Guard for endpoints that need an authenticated YouTube session.
 */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.ytmusic || !req.ytmusic.hasSession()) {
    res.status(401).json({
      error: 'Not connected to YouTube Music. Please sign in again.',
      code: 'NOT_AUTHENTICATED',
    });
    return;
  }
  next();
}
