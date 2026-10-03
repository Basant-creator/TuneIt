import { describe, expect, it } from 'vitest';
import { backendRewrites, checkApiConfig } from '../../next.config';

/**
 * Without a custom domain the app passes /api and /auth through to the
 * backend, so the session cookie is first-party and sign-in works in Safari
 * and Firefox. A wrong rewrite here means nobody can sign in at all.
 */
describe('backend pass-through', () => {
  it('is off unless BACKEND_ORIGIN is set', () => {
    expect(backendRewrites(undefined)).toEqual([]);
    expect(backendRewrites('')).toEqual([]);
  });

  it('passes the API and the sign-in routes through, nothing else', () => {
    expect(backendRewrites('https://tuneit-api.onrender.com/')).toEqual([
      { source: '/api/:path*', destination: 'https://tuneit-api.onrender.com/api/:path*' },
      { source: '/auth/:path*', destination: 'https://tuneit-api.onrender.com/auth/:path*' },
    ]);
  });

  it.each(['tuneit-api.onrender.com', 'https://tuneit-api.onrender.com/api', 'ftp://x.example.com'])(
    'refuses %j, which would send requests somewhere wrong',
    (origin) => {
      expect(() => backendRewrites(origin)).toThrow(/BACKEND_ORIGIN/);
    }
  );

  it('refuses a same-origin API URL with nowhere to send it', () => {
    expect(() => checkApiConfig({ NEXT_PUBLIC_API_URL: '/' })).toThrow(/BACKEND_ORIGIN/);
    expect(() => checkApiConfig({ NEXT_PUBLIC_API_URL: '/', BACKEND_ORIGIN: 'https://a.onrender.com' })).not.toThrow();
    expect(() => checkApiConfig({ NEXT_PUBLIC_API_URL: 'https://api.example.com' })).not.toThrow();
    expect(() => checkApiConfig({})).not.toThrow();
  });

  it('refuses an API URL that is neither "/" nor http(s)', () => {
    // Git Bash on Windows turns "/" into "C:/Program Files/Git/" when passed
    // on the command line; that build must fail, not ship broken links.
    expect(() => checkApiConfig({ NEXT_PUBLIC_API_URL: 'C:/Program Files/Git/' })).toThrow(/http\(s\) URL/);
    expect(() => checkApiConfig({ NEXT_PUBLIC_API_URL: 'tuneit-api.onrender.com' })).toThrow();
  });
});
