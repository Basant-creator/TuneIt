/**
 * HTTP smoke test (scripts/smokeTest.ts)
 *
 * Boots the real Express app on an ephemeral port and exercises the surface the
 * frontend actually calls. Complements `verify:engines`, which tests the engines
 * in isolation: this one checks routing, auth gating, CORS and session handling.
 *
 * It needs no Google credentials and no database — every asserted path is one
 * that must work before authentication.
 *
 * Run with:  npm run verify:api
 */

import http from 'http';
import type { AddressInfo } from 'net';
import app from '../src/server';
import { initSession, getSessionService, sweepExpiredSessions } from '../src/services/sessionStore';
import { handleControllerError } from '../src/utils/errorHandler';
import type { YtMusicService } from '../src/services/ytmusicService';

interface Result {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}

let passed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function call(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<Result> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, method, path, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let body: any = raw;
          try {
            body = JSON.parse(raw);
          } catch {
            /* non-JSON responses (redirects) are fine */
          }
          resolve({ status: res.statusCode || 0, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function cookieFrom(res: Result): string | undefined {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie?.length) return undefined;
  const match = setCookie.find((c) => c.startsWith('tuneit_sid='));
  return match?.split(';')[0];
}

async function main(): Promise<void> {
  // `server.ts` already calls app.listen on PORT; start a second, isolated
  // listener on an ephemeral port so the test never collides with a dev server.
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  console.log(`TuneIt — API smoke test (127.0.0.1:${port})`);
  console.log('='.repeat(78));

  try {
    console.log('\nHealth & readiness');
    const health = await call(port, 'GET', '/health');
    assert('GET /health returns 200', health.status === 200, `got ${health.status}`);
    assert('health reports ok', health.body?.status === 'ok', JSON.stringify(health.body));
    assert('health reports session count', typeof health.body?.activeSessions === 'number');

    const ready = await call(port, 'GET', '/ready');
    assert(
      'GET /ready answers 200 or 503',
      ready.status === 200 || ready.status === 503,
      `got ${ready.status}`
    );

    console.log('\nAuth gating — every /api route must reject an anonymous caller');
    const protectedRoutes: Array<[string, string]> = [
      ['GET', '/api/me'],
      ['GET', '/api/playlists'],
      ['GET', '/api/playlists/PL123/tracks'],
      ['GET', '/api/playlists/PL123/recommendations'],
      ['POST', '/api/playlists/PL123/rearrange'],
      ['POST', '/api/playlists/PL123/rise'],
      ['POST', '/api/playlists/PL123/drift'],
      ['POST', '/api/playlists/PL123/frame'],
      ['POST', '/api/playlists/PL123/unhinged'],
      ['POST', '/api/playlists/export'],
    ];
    for (const [method, path] of protectedRoutes) {
      const res = await call(port, method, path);
      assert(`${method} ${path} -> 401`, res.status === 401, `got ${res.status}`);
      if (res.status === 401) {
        assert(
          `${method} ${path} sends NOT_AUTHENTICATED`,
          res.body?.code === 'NOT_AUTHENTICATED',
          JSON.stringify(res.body)
        );
      }
    }

    console.log('\nAuth status & session issuance');
    const status = await call(port, 'GET', '/auth/status');
    assert('GET /auth/status returns 200 when signed out', status.status === 200, `got ${status.status}`);
    assert('status reports authenticated=false', status.body?.authenticated === false);

    const login = await call(port, 'GET', '/auth/login');
    assert('GET /auth/login redirects', login.status === 302, `got ${login.status}`);
    assert(
      'login redirects to Google',
      typeof login.headers.location === 'string' &&
        login.headers.location.includes('accounts.google.com'),
      String(login.headers.location)
    );

    const sessionCookie = cookieFrom(login);
    assert('login issues a session cookie', !!sessionCookie);
    const rawCookie = login.headers['set-cookie']?.[0] ?? '';
    assert('session cookie is HttpOnly', /HttpOnly/i.test(rawCookie), rawCookie);
    assert('session cookie is scoped to /', /Path=\//i.test(rawCookie), rawCookie);

    // The session id must also travel as OAuth `state` — that is what binds the
    // callback to this browser and gives CSRF protection.
    const loginUrl = new URL(String(login.headers.location));
    const state = loginUrl.searchParams.get('state');
    assert('login carries an OAuth state parameter', !!state);
    assert(
      'state matches the issued session id',
      !!state && sessionCookie === `tuneit_sid=${state}`,
      `state=${state} cookie=${sessionCookie}`
    );
    assert(
      'login requests temporary online access (no refresh token)',
      loginUrl.searchParams.get('access_type') === 'online',
      String(loginUrl.searchParams.get('access_type'))
    );
    assert(
      'login asks which Google account to use',
      loginUrl.searchParams.get('prompt') === 'select_account',
      String(loginUrl.searchParams.get('prompt'))
    );
    const maxAge = Number(/Max-Age=(\d+)/i.exec(rawCookie)?.[1]);
    assert('session cookie lasts at most an hour', maxAge > 0 && maxAge <= 3600, rawCookie);

    console.log('\nSession isolation');
    const secondLogin = await call(port, 'GET', '/auth/login');
    const secondCookie = cookieFrom(secondLogin);
    assert('a second visitor gets a different session id', !!secondCookie && secondCookie !== sessionCookie);

    // A session that exists but has no Google tokens must still be refused.
    const withCookie = await call(port, 'GET', '/api/playlists', { Cookie: sessionCookie! });
    assert(
      'an un-completed session still cannot read playlists',
      withCookie.status === 401,
      `got ${withCookie.status}`
    );

    console.log('\nTemporary sign-in');
    const HOUR = 60 * 60 * 1000;
    const signedIn = (expiresIn: number): { id: string; service: YtMusicService } => {
      const id = `smoke-${Math.random().toString(36).slice(2)}`;
      const service = initSession(id);
      service.applyTokens({ access_token: `at-${id}`, refresh_token: 'rt-should-be-dropped', expiry_date: Date.now() + expiresIn });
      return { id, service };
    };
    const credentialsOf = (service: YtMusicService) => (service as any).oauth2Client.credentials;
    const stubRevoke = (service: YtMusicService, fail = false) => {
      const revoked: string[] = [];
      (service as any).oauth2Client.revokeToken = async (token: string) => {
        if (fail) throw new Error('network down');
        revoked.push(token);
        return {};
      };
      return revoked;
    };

    const live = signedIn(HOUR);
    assert('a fresh access token counts as signed in', live.service.hasSession());
    assert('a refresh token is never kept, even if Google sends one', !credentialsOf(live.service).refresh_token);

    const liveStatus = await call(port, 'GET', '/auth/status', { Cookie: `tuneit_sid=${live.id}` });
    assert('status reports authenticated while the token is good', liveStatus.body?.authenticated === true);
    assert(
      'status reports when the sign-in ends',
      typeof liveStatus.body?.expiresAt === 'number' && liveStatus.body.expiresAt > Date.now(),
      JSON.stringify(liveStatus.body)
    );

    const expired = signedIn(-1000);
    assert('an expired token is signed out', !expired.service.hasSession() && expired.service.isExpired());
    const expiredCall = await call(port, 'GET', '/api/playlists', { Cookie: `tuneit_sid=${expired.id}` });
    assert(
      'an expired session gets 401 NOT_AUTHENTICATED, not a Google error',
      expiredCall.status === 401 && expiredCall.body?.code === 'NOT_AUTHENTICATED',
      `got ${expiredCall.status} ${JSON.stringify(expiredCall.body)}`
    );
    assert('an expired session is dropped', getSessionService(expired.id) === null);

    const nearlyExpired = signedIn(30 * 1000);
    assert('a token with under a minute left is treated as expired', !nearlyExpired.service.hasSession());

    const leaving = signedIn(HOUR);
    const revoked = stubRevoke(leaving.service);
    const logout = await call(port, 'POST', '/auth/logout', { Cookie: `tuneit_sid=${leaving.id}` });
    assert('logout succeeds', logout.status === 200, `got ${logout.status}`);
    assert('logout revokes the Google token', revoked.length === 1 && revoked[0] === `at-${leaving.id}`, JSON.stringify(revoked));
    assert('logout forgets the session', getSessionService(leaving.id) === null);
    assert('logout forgets the token', !credentialsOf(leaving.service).access_token);

    const unreachable = signedIn(HOUR);
    stubRevoke(unreachable.service, true);
    const logoutOffline = await call(port, 'POST', '/auth/logout', { Cookie: `tuneit_sid=${unreachable.id}` });
    assert('logout still succeeds when Google cannot be reached', logoutOffline.status === 200, `got ${logoutOffline.status}`);
    assert('...and the session is still forgotten', getSessionService(unreachable.id) === null);

    const earlier = signedIn(HOUR);
    const revokedOnRelogin = stubRevoke(earlier.service);
    const relogin = await call(port, 'GET', '/auth/login', { Cookie: `tuneit_sid=${earlier.id}` });
    assert('signing in again revokes the earlier token', revokedOnRelogin.length === 1, JSON.stringify(revokedOnRelogin));
    assert('signing in again issues a new session', cookieFrom(relogin) !== `tuneit_sid=${earlier.id}`);

    const kept = signedIn(HOUR);
    const pendingId = `smoke-pending-${Math.random().toString(36).slice(2)}`;
    initSession(pendingId);
    const later = Date.now() + 16 * 60 * 1000;
    sweepExpiredSessions(later);
    assert('the sweep drops a login never completed at Google', getSessionService(pendingId) === null);
    assert('the sweep keeps a signed-in session whose token is still good', getSessionService(kept.id) !== null);
    sweepExpiredSessions(Date.now() + 2 * HOUR);
    assert('the sweep drops a session once its token has expired', getSessionService(kept.id) === null);

    // Google answers 401 once a token is expired or revoked mid-request.
    let sent: { status: number; body: any } | null = null;
    const fakeRes: any = {
      status(code: number) {
        return { json: (body: any) => { sent = { status: code, body }; } };
      },
    };
    const quiet = console.error;
    console.error = () => {};
    handleControllerError(fakeRes, Object.assign(new Error('Invalid Credentials'), { response: { status: 401 } }), 'smoke');
    console.error = quiet;
    assert(
      "Google's 401 reaches the browser as signed out",
      sent !== null && (sent as any).status === 401 && (sent as any).body?.code === 'NOT_AUTHENTICATED',
      JSON.stringify(sent)
    );

    console.log('\nCallback hardening');
    const noCode = await call(port, 'GET', '/auth/callback');
    assert('callback without a code redirects to the frontend', noCode.status === 302, `got ${noCode.status}`);
    assert(
      'callback surfaces the failure in the URL',
      String(noCode.headers.location).includes('auth_error='),
      String(noCode.headers.location)
    );

    const badState = await call(port, 'GET', '/auth/callback?code=abc&state=not-a-real-session');
    assert('callback with an unknown state is rejected', badState.status === 302, `got ${badState.status}`);
    assert(
      'unknown state reports session_expired',
      String(badState.headers.location).includes('session_expired'),
      String(badState.headers.location)
    );

    console.log('\nCORS');
    const allowed = await call(port, 'GET', '/health', { Origin: 'http://127.0.0.1:3000' });
    assert(
      'allowed origin is echoed back',
      allowed.headers['access-control-allow-origin'] === 'http://127.0.0.1:3000',
      String(allowed.headers['access-control-allow-origin'])
    );
    assert(
      'credentials are allowed (needed for the session cookie)',
      allowed.headers['access-control-allow-credentials'] === 'true'
    );

    const blocked = await call(port, 'GET', '/health', { Origin: 'https://evil.example.com' });
    assert(
      'unknown origin gets no CORS grant',
      !blocked.headers['access-control-allow-origin'],
      String(blocked.headers['access-control-allow-origin'])
    );

    console.log('\nCaching');
    // A CDN in front (Vercel, when there is no custom domain) must never keep a
    // response carrying a session cookie or someone's playlists.
    for (const res of [status, login, await call(port, 'GET', '/api/playlists')]) {
      assert(
        `${res.status} response is marked no-store`,
        String(res.headers['cache-control']).includes('no-store'),
        String(res.headers['cache-control'])
      );
    }

    console.log('\nMisc');
    const notFound = await call(port, 'GET', '/definitely/not/a/route');
    assert('unknown route returns a JSON 404', notFound.status === 404 && !!notFound.body?.error);
    assert('x-powered-by is disabled', !allowed.headers['x-powered-by']);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n' + '='.repeat(78));
  if (failures.length === 0) {
    console.log(`✅ All ${passed} API smoke checks passed.`);
    process.exit(0);
  }
  console.log(`❌ ${failures.length} check(s) failed out of ${passed + failures.length}:\n`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
