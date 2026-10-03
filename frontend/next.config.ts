import type { NextConfig } from 'next';

/**
 * Without a custom domain, the app is on *.vercel.app and the API on
 * *.onrender.com. The API's session cookie would then be a third-party cookie,
 * which Safari blocks and Firefox partitions, so sign-in would loop. Instead,
 * set BACKEND_ORIGIN (server-side, e.g. https://tuneit-api.onrender.com) and
 * NEXT_PUBLIC_API_URL=/ : the browser calls this app's own /api and /auth,
 * Vercel passes them through to the backend, and the cookie is first-party.
 *
 * With a custom domain (app.example.com + api.example.com) leave
 * BACKEND_ORIGIN unset and point NEXT_PUBLIC_API_URL at the API instead.
 */
export function backendRewrites(origin: string | undefined) {
  if (!origin) return [];
  const base = origin.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+$/.test(base)) {
    throw new Error(`BACKEND_ORIGIN must be an origin like https://tuneit-api.onrender.com, got "${origin}"`);
  }
  return [
    { source: '/api/:path*', destination: `${base}/api/:path*` },
    { source: '/auth/:path*', destination: `${base}/auth/:path*` },
  ];
}

/**
 * NEXT_PUBLIC_API_URL is baked into the bundle, so a bad value must fail the
 * build rather than ship. It is either "/" (same origin, which needs the
 * BACKEND_ORIGIN pass-through) or an absolute http(s) URL.
 */
export function checkApiConfig(env: Record<string, string | undefined>): void {
  const apiUrl = env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) return; // local development falls back to http://127.0.0.1:3001
  if (apiUrl === '/') {
    if (!env.BACKEND_ORIGIN) {
      throw new Error('NEXT_PUBLIC_API_URL is "/" but BACKEND_ORIGIN is not set: /api and /auth would have nowhere to go.');
    }
    return;
  }
  if (!/^https?:\/\//.test(apiUrl)) {
    throw new Error(`NEXT_PUBLIC_API_URL must be "/" or an http(s) URL, got "${apiUrl}".`);
  }
}

checkApiConfig(process.env);

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runtime stage.
  output: 'standalone',

  // Fail the production build on type errors rather than shipping them.
  // (Next 16 dropped the `eslint` key; linting runs as its own CI step.)
  typescript: { ignoreBuildErrors: false },

  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // Album art comes from YouTube's CDNs; everything else is same-origin.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  async rewrites() {
    return backendRewrites(process.env.BACKEND_ORIGIN);
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
