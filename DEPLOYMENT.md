# Deploying TuneIt

TuneIt is two deployables that talk over HTTP with a session cookie:

| Piece | What it is | Typical host |
| :--- | :--- | :--- |
| `frontend/` | Next.js 16 app (App Router) | Vercel, or the included Dockerfile |
| `backend/` | Express API + 4 flow engines | Render / Railway / Fly.io, or the included Dockerfile |
| Postgres | Cache of AI-analysed tracks | Neon, Supabase, Render Postgres, RDS |

---

## 1. Prerequisites

- **Node.js 20+** (the backend declares `>=18`, CI and the images use 20)
- **A PostgreSQL database** and its connection string
- **Google OAuth client** — Google Cloud Console → APIs & Services → Credentials → *OAuth client ID* → *Web application*
  - Enable the **YouTube Data API v3** for the project
  - Add the backend callback under **Authorized redirect URIs**, exactly:
    `https://api.your-domain.com/auth/callback`
- **Gemini API key** — https://aistudio.google.com/apikey

> **Google verification.** The `https://www.googleapis.com/auth/youtube` scope is
> *sensitive*. Until the OAuth consent screen is verified, only accounts listed
> as **Test users** can sign in, and consent expires every 7 days. Plan for the
> verification review before any public launch.

---

## 2. Environment variables

Templates live at `backend/.env.example` and `frontend/.env.example`. Copy them,
do not commit the filled-in versions.

### Backend

| Variable | Required | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | yes | `production` in deployment. Enables fail-fast config validation. |
| `PORT` | no | Defaults to `3001`. Most platforms inject this. |
| `FRONTEND_URL` | yes | Exact origin of the deployed frontend. Drives CORS and post-login redirects. |
| `ADDITIONAL_CORS_ORIGINS` | no | Comma-separated extra origins, e.g. Vercel preview URLs. |
| `GOOGLE_CLIENT_ID` | yes | |
| `GOOGLE_CLIENT_SECRET` | yes | |
| `GOOGLE_REDIRECT_URI` | yes | Must match the Google console entry character for character. |
| `GEMINI_API_KEY` | yes | Without it every track falls back to heuristic BPM/intensity. |
| `DATABASE_URL` | yes | PostgreSQL. Add `?sslmode=require` for most managed providers. |
| `DAILY_EXPORT_LIMIT` | no | Playlist creations per session per day. Default `3`. |
| `CROSS_SITE_COOKIES` | no | Force `SameSite=None; Secure`. Auto-detected from the URLs above. |

In production, a missing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GEMINI_API_KEY` or `DATABASE_URL` **stops the server from booting** rather than
failing on the first request.

### Frontend

| Variable | Required | Notes |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | yes | Base URL of the backend. **Inlined at build time** — changing it requires a rebuild, not just a restart. |
| `NEXT_PUBLIC_APP_URL` | no | Public URL of this app. |

---

## 3. Database

```bash
cd backend
npx prisma db push          # first deploy / no migration history
# or, once you keep migrations under version control:
npx prisma migrate deploy
```

`npm run build` runs `prisma generate` first, so the client is always in sync
with `prisma/schema.prisma`.

> **Upgrading an existing deployment:** the `youtube_tracks` table gained two
> nullable columns, `valence` and `camelotKey`. Both are additive, so
> `prisma db push` applies them without data loss. Rows analysed before the
> upgrade keep null values and are treated as "unknown" — the engines fall back
> to energy-only sequencing for those tracks until they are re-analysed.

---

## 4. Deploy the backend

### Render / Railway / Fly.io (Node buildpack)

- **Build command:** `npm ci && npm run build`
- **Start command:** `npm start`
- **Health check path:** `/health` (liveness) or `/ready` (also checks Postgres)

### Docker

```bash
docker build -t tuneit-backend ./backend
docker run -p 3001:3001 --env-file backend/.env tuneit-backend
```

The image runs as the unprivileged `node` user and ships a `HEALTHCHECK`.

---

## 5. Deploy the frontend

### Vercel

- **Root directory:** `frontend`
- **Framework preset:** Next.js
- **Environment variable:** `NEXT_PUBLIC_API_URL=https://api.your-domain.com`

Vercel gives every preview deployment its own URL. Add those origins to the
backend's `ADDITIONAL_CORS_ORIGINS`, or previews will fail CORS.

### Docker

`NEXT_PUBLIC_*` values are baked into the bundle, so they are **build args**:

```bash
docker build -t tuneit-frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.your-domain.com \
  ./frontend
docker run -p 3000:3000 tuneit-frontend
```

---

## 6. Run the whole stack locally

```bash
cp backend/.env.example backend/.env    # fill in Google + Gemini credentials
docker compose up --build
```

Frontend on http://localhost:3000, backend on http://127.0.0.1:3001, Postgres on
`localhost:5432`.

Without Docker:

```bash
cd backend  && npm install && npx prisma db push && npm run dev
cd frontend && npm install && npm run dev
```

> Use `127.0.0.1` rather than `localhost` for the backend in local URLs, and keep
> it consistent across `FRONTEND_URL`, `GOOGLE_REDIRECT_URI` and
> `NEXT_PUBLIC_API_URL`. Mixing the two makes the browser treat the API as a
> different site and drop the session cookie.

---

## 7. Verification

```bash
cd backend
npm run verify:engines   # all 4 engines against the frontend contract
npm run verify:api       # routing, auth gating, session isolation, CORS
npm run verify           # both

cd ../frontend
npm run typecheck
npx eslint src --max-warnings=0
npm test                 # 62 unit + component tests (vitest + testing-library)
npm run build
```

`.github/workflows/ci.yml` runs all of the above on every push and PR.

---

## 8. Known operational limits

These are real constraints of the current build, not TODOs hidden in code.

1. **Sessions are in-process.** `backend/src/services/sessionStore.ts` holds
   OAuth tokens in a `Map`. Consequences:
   - A backend restart signs everyone out.
   - **Running more than one replica breaks login** — the callback may land on a
     different instance than the one that issued the session. Either pin to a
     single instance or move the store to Redis/Postgres before scaling out.
2. **The export rate limiter is in-process too**, with the same caveat
   (`backend/src/utils/exportRateLimiter.ts`).
3. **YouTube Data API quota** is 10,000 units/day by default. Playlist creation
   costs ~50 units and each track insert ~50, so a 30-track export is ~1,550
   units — roughly 6 exports/day across *all* users. `DAILY_EXPORT_LIMIT` guards
   per session; the CSV download path has no quota cost and is the better
   default for most users.
4. **Harmonic matching depends on the analyser.** Camelot keys come from Gemini
   and are stored only when well-formed. When a key is unknown, the engines make
   no harmonic claim rather than guessing one, so Unhinged's anchoring falls back
   to BPM and energy. Keys are never derived from the video id.
5. **Recommendations are quota-expensive.** Each run issues 4 YouTube
   `search.list` calls at **100 units each — ~400 units per click**. They are
   fetched only when the user opens the Recommendations tab, not automatically
   after every rearrange, but at the default 10,000-unit quota that is still
   only ~25 recommendation loads per day across all users.
6. **Gemini free tier is rate-limited.** Analysis is throttled to 14 requests/min
   (`trackCacheService.ts`) and batched 12 tracks per call. On quota exhaustion
   it silently falls back to heuristics, so scores degrade rather than fail.
7. **First analysis of a large playlist is slow** — a cold 100-track playlist is
   several Gemini round trips. Results are cached in Postgres by
   `artist:::title`, so repeat runs are fast.
8. **Frontend tests cover units and components, not journeys.** `npm test` runs
   62 vitest/testing-library tests over the API client, CSV export, the stats
   panel, the preview modal and the track list. There is no end-to-end suite, so
   the signed-in OAuth journey is still only verified by hand.
9. **Long playlists render windowed.** Above 60 tracks the list switches to
   virtualized rows and drops the per-row reorder animation
   (`frontend/src/components/TrackList.tsx`). Row height is fixed at 68px; a
   future variable-height row would need `measureElement`.
