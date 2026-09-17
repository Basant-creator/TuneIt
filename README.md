# 🎵 TuneIt - Smart Playlist Flow Sequencer

> **Transform chaotic music playlists into smooth, effortless listening journeys.**

---

## 🌟 What is TuneIt?

Have you ever played a playlist on shuffle, only for a peaceful acoustic song to be immediately followed by a blasting metal track or heavy electronic dance beat? **TuneIt** fixes that exact problem!

**TuneIt** is an intelligent playlist organizer. It connects to your YouTube Music account, analyzes the energy level and speed (BPM) of every song using artificial intelligence, and automatically rearranges your playlist so that every transition feels smooth, natural, and satisfying.

---

## 🚀 How TuneIt Works (From Start to Finish)

Understanding TuneIt is simple! Here is the complete journey of how a playlist gets transformed:

```
[ 1. Connect Account / Select Playlist ]
                   │
                   ▼
[ 2. Fetch Track Details (Title, Artist, Tags) ]
                   │
                   ▼
[ 3. AI Energy & Tempo Analysis (Gemini AI) ]
                   │
                   ▼
[ 4. Smart Caching (Instant Speed for Future Use) ]
                   │
                   ▼
[ 5. Choose Flow Mode (Build-Up, Drift, Phonk, Chill) ]
                   │
                   ▼
[ 6. Smart Rearrangement Algorithm ]
                   │
                   ▼
[ 7. Preview Interactive Energy Graph & Audio ]
                   │
                   ▼
[ 8. Export directly to YouTube Music or Download CSV ]
```

### Step 1: Connect Your Account
Log in with your **Google / YouTube Music** account. TuneIt safely loads your public and private playlists.

### Step 2: Extract Track Information
TuneIt scans your selected playlist and pulls basic details for each song, such as the title, artist name, video ID, and music genre tags.

### Step 3: AI Energy & Tempo Analysis
Using Google's **Gemini AI**, TuneIt reads the song's style and determines two key metrics:
- **BPM (Beats Per Minute)**: How fast or slow the song moves.
- **Sonic Intensity (0.0 to 1.0)**: How calm or aggressive the song feels (e.g., `0.2` = peaceful ambient/lo-fi; `0.8` = intense workout/rock beat).

### Step 4: Smart Caching
To keep things fast and save network data, song metrics are saved in a local database. If a song has been analyzed once, TuneIt remembers it instantly the next time.

### Step 5: Choose Your Listening Flow
Select how you want your music to feel. TuneIt offers **4 unique Flow Modes** tailored to different activities.

### Step 6: Smart Re-ordering
TuneIt's built-in mathematical engines sort and sequence your songs so energy levels change gradually without sudden volume or mood spikes.

### Step 7: Preview & Tweak
Before saving, view an interactive **Energy Graph** that shows your playlist's energy curve. Listen to 30-second audio previews directly in your browser.

### Step 8: Export Back to YouTube Music
With one click, export the brand new, perfectly ordered playlist back to your YouTube Music library, or download it as a CSV file to share with friends!

---

## 🎧 The 4 Flow Modes Explained Simply

| Mode Name | Vibe & Purpose | How It Arranges Songs |
| :--- | :--- | :--- |
| **Build-Up Mode (Rise Engine)** | Perfect for workouts & running. | Starts with calm, easygoing tracks and steadily climbs uphill like a staircase, building up to high-energy peaks. |
| **Drift Mode** | Great for deep work, studying, coding, or reading. | Keeps the energy level flat and stable. Eliminates jarring mood jumps so you stay focused without distraction. |
| **Unhinged Mode** | High-energy gaming & parties. | Pairs high-intensity tracks with unexpected "curveball" transitions, using musical key alignment to keep it sounding great. |
| **Frame Engine** | Cinematic Experience. | Formatted like a 3-Act movie: Warm-up Intro (Act I), Main Energy Groove (Act II), and a gentle Wind-Down (Act III). |

---

## 🛠️ Project Structure & Technical Architecture

TuneIt is built with a modern, high-performance web architecture:

```
TuneIt Workspace Root
 ├── backend/            # Express.js REST API, YouTube Auth, AI Service, and Flow Engines
 │    ├── src/
 │    │    ├── config/       # Environment & Google OAuth Configuration
 │    │    ├── controllers/  # API Route Handlers (Playlists, Auth, Flow Rearranging)
 │    │    ├── middleware/   # Per-visitor session resolution & auth guard
 │    │    ├── routes/       # Auth & Playlist Endpoints
 │    │    ├── services/     # AI Analysis, YouTube API, Session Store, Flow Engine Adapter
 │    │    └── utils/        # 4 Sequencing Algorithms, Shared Metrics & Error Handlers
 │    └── scripts/
 │         ├── fixtures/     # Evaluation Datasets (MTG-Jamendo & Musav)
 │         ├── evaluate*.ts  # Performance & Smoothness Evaluation Benchmark Scripts
 │         ├── verifyEngineContract.ts  # Engine ↔ frontend contract checks
 │         └── smokeTest.ts             # Live HTTP checks (routing, auth, CORS)
 └── frontend/           # Next.js 16 (App Router), React, Tailwind CSS, & Framer Motion
      ├── src/
      │    ├── app/          # Web Pages (Home, Playlist Viewer, Dynamic Routes)
      │    ├── components/   # UI Components (Energy Chart, Flow Stats, Audio Player)
      │    ├── services/     # Typed API client for the backend
      │    ├── types/        # Shared flow-engine contract types
      │    └── utils/        # CSV Export & Audio Preview Utilities
```

### API surface

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/health` · `/ready` | Liveness / readiness (readiness also pings Postgres) |
| `GET` | `/auth/login` · `/auth/callback` · `/auth/status` | Google OAuth round trip and session state |
| `POST` | `/auth/logout` | Clears the session |
| `GET` | `/api/me` · `/api/playlists` | Signed-in profile and playlists |
| `GET` | `/api/playlists/:id/tracks` | Playlist in its original order |
| `POST` | `/api/playlists/:id/rearrange` | **Any engine** — body `{ "mode": "bu" \| "df" \| "ph" \| "cm" }` |
| `POST` | `/api/playlists/:id/{rise,drift,frame,unhinged}` | Named aliases for the same engines |
| `GET` | `/api/playlists/:id/recommendations` | 4 AI-suggested continuations |
| `POST` | `/api/playlists/export` | Creates the sequenced playlist on YouTube Music |

Every engine responds with the same contract — `tracks`, `harshTracks`,
`metrics` (smoothness, ΔE, jarring jumps, energy curve) and counts — so the UI
never branches on which engine ran.

**Deployment:** see [DEPLOYMENT.md](DEPLOYMENT.md) for hosting, environment
variables, Docker, and the known operational limits.

---

## 📊 Combined Live Algorithm Benchmarks

We executed live benchmarks on both a standard 21-track playlist and a high-scale 500-track dataset. Here are the real-world performance metrics:

### 1. Standard 21-Track Playlist Benchmark
| Engine Mode | Tracks Retained | Smoothness Score | Jarring Jumps (>0.35) | Vibe Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **Rise Algorithm** | 21 / 21 (100%) | **96.4 / 100** | 0 | Perfect Staircase Ascent |
| **Frame Engine** | 21 / 21 (100%) | **94.6 / 100** | 0 | Balanced 3-Act Narrative |
| **Drift Mode** | 9 / 21 (42.9%) | **92.6 / 100** | 0 | Filters Extreme Spikes |
| **Unhinged Engine** | 21 / 21 (100%) | **92.5 / 100** | 1 (Intentional) | Exciting Curveball Drop |

### 2. High-Scale 500-Track Dataset Speed & Retention
| Engine Mode | Execution Speed | Throughput Rate | Track Retention | Smoothness Score |
| :--- | :--- | :--- | :--- | :--- |
| **Rise Algorithm** | 3.18 milliseconds | **157,233 tracks/sec** | 500 / 500 (100%) | **99.73 / 100** |
| **Drift Mode** | 4.49 milliseconds | **111,359 tracks/sec** | 138 / 500 (27.6%) | **98.66 / 100** |
| **Frame Engine** | 11.02 milliseconds | **45,372 tracks/sec** | 412 / 500 (82.4%) | **99.48 / 100** |
| **Unhinged Engine** | 106.22 milliseconds | **4,707 tracks/sec** | 472 / 500 (94.4%) | **89.61 / 100** |

---

## ⚙️ Running TuneIt Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**
- **Gemini API Key**: From Google AI Studio (for AI metadata analysis)
- **Google OAuth Credentials**: From Google Cloud Console (for YouTube Music login)

---

### 1. Setting Up the Backend

```bash
# Move to the backend folder
cd backend

# Install dependencies
npm install

# Create a .env file with your credentials
# (Reference .env.example)
PORT=3001
FRONTEND_URL=http://127.0.0.1:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:3001/auth/callback
GEMINI_API_KEY=your_gemini_api_key

# Start the development backend server
npm run dev
```

The backend API will run on `http://127.0.0.1:3001`.

---

### 2. Setting Up the Frontend

```bash
# Move to the frontend folder
cd ../frontend

# Install dependencies
npm install

# Create a .env.local file
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001

# Start the frontend app
npm run dev
```

Open your browser and visit `http://localhost:3000`.

---

### 3. Running Algorithm Evaluation Benchmarks

TuneIt comes with built-in evaluation tools to test algorithm throughput, smoothness scores, and performance across high-scale track pools:

```bash
cd backend

# Test all 4 engines on standard dataset
npm run evaluate:all

# Test engines on high-scale 1,000-track dataset
npm run evaluate:jamendo
```

### Integrity checks

```bash
cd backend
npm run verify:engines   # every engine against the frontend contract
npm run verify:api       # routing, auth gating, session isolation, CORS
npm run verify           # both

cd ../frontend
npm test                 # 62 unit + component tests
npm run typecheck && npx eslint src --max-warnings=0 && npm run build
```

`verify:engines` asserts that all four engines preserve `videoId` (so exports
work), never duplicate or invent tracks, keep their counts consistent, and
report metrics on the same scale — across pool sizes from 1 to 80 tracks.

---

## 📄 License & Credits

Built with ❤️ by the **TuneIt Team**. Powered by Google Gemini AI, YouTube Music API, and Next.js.
