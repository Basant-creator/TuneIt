# 🎵 TuneIt — Smart Intelligent Music Sequencing Engine

> **Imagine having a world-class DJ or movie soundtrack director automatically arrange your music playlists so every song flows perfectly into the next.**

---

## 🌟 What is TuneIt?

Have you ever listened to a playlist on shuffle and felt annoyed when a quiet acoustic song was suddenly followed by a blasting metal or dance track? 

**TuneIt** solves that problem! It is an intelligent music engine that takes any pool of songs and rearranges them into smooth, beautiful listening experiences. Whether you are studying, working out, or relaxing, TuneIt ensures there are no jarring jumps, sudden volume shocks, or awkward transitions.

---

## 🧠 How It Works (The 2 Smart Modes)

TuneIt offers two unique algorithms depending on what you want to do:

```text
  [Unorganized Playlist] 
           │
           ├───► 🌊 1. MENTAL DRIFT MODE  ──► Steady, Uninterrupted Focus Flow
           │
           └───► 🎬 2. FRAME ENGINE MODE  ──► 3-Act Cinematic Narrative Journey
```

---

### 🌊 1. Mental Drift Mode (For Deep Focus & Study)
* **The Goal:** Keep your mind in the "flow state" without any sudden distractions.
* **How it works:** Imagine a calm river flowing at a steady speed. Mental Drift filters out any songs that are too loud or too aggressive for your focus, keeping the energy level smooth and consistent.
* **Best for:** Studying, reading, coding, or deep work sessions.

---

### 🎬 2. Frame Engine Mode (The Storyteller / Cinematic Arc)
* **The Goal:** Take you on an emotional music journey, just like a 3-Act movie!
* **How it works:** It organizes your songs into a structured 3-Act Narrative Arc:
  1. **Act I (The Introduction):** Soft, comfortable entry to get you grounded.
  2. **Act II (The Climax or Ambient Valley):** Gradually builds up energy to a thrilling peak (or drops down into an ambient valley).
  3. **Act III (The Smooth Landing):** A gentle, non-increasing landing ramp that brings you safely back down to rest.
* **Best for:** Road trips, workouts, evening relaxation, or movie-like listening.

---

## 📊 Performance & Accuracy (At a Glance)

TuneIt is not just smart—it is **blisteringly fast**:

| Feature / Metric | Performance | What it means in plain English |
| :--- | :--- | :--- |
| ⚡ **Speed** | **36 ms for 1,000 songs** | Processes 27,000+ songs per second. Results appear instantly! |
| 🎯 **Smoothness Score** | **99.5 / 100** | Over 99% smooth transitions with zero sudden volume shocks. |
| 🚫 **Jarring Jumps** | **0 Jumps (>0.35)** | Eliminates all painful energy spikes. |
| 📈 **Track Retention** | **83%+ Kept** | Keeps over 83% of your original playlist intact without losing songs needlessly. |

---

## 🚀 Easy Setup Instructions (Step-by-Step)

You do **not** need advanced programming knowledge to run TuneIt! Just follow these simple steps:

### Step 1: Install Node.js
1. Go to [nodejs.org](https://nodejs.org) and download the **LTS (Recommended)** version.
2. Follow the installer instructions on your screen.

---

### Step 2: Open Terminal / Command Prompt
* **Windows:** Press `Win + R`, type `cmd`, and press **Enter**.
* **Mac:** Press `Cmd + Space`, type `Terminal`, and press **Enter**.

---

### Step 3: Navigate to Backend & Install Dependencies
Run the following commands one by one:

```bash
# 1. Go into the backend directory
cd backend

# 2. Install all required packages
npm install
```

---

### Step 4: Configure Environment Variables (`.env`)
Create a file named `.env` inside the `backend` folder and paste the following settings:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback
```

---

## 5. Start TuneIt!
To start the backend server:

```bash
npm run dev
```

To run the frontend app in a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your web browser to see TuneIt in action!

---

## 🧪 How to Test the Engines (1-Click Commands)

You can run automated benchmarks to see the algorithms sequence music in real-time right inside your terminal:

```bash
# Go into the backend directory first
cd backend

# 1. Test the Frame Engine (3-Act Narrative Mode)
npm run evaluate:frame

# 2. Test the Mental Drift Engine (Focus Mode)
npm run evaluate:musav

# 3. Test Large-Scale Performance on 1,000 tracks (MTG-Jamendo Dataset)
npm run evaluate:jamendo
```

---

## 📁 Project Structure

```text
TuneIt/
├── backend/                  # Node.js / TypeScript Core Server
│   ├── src/
│   │   ├── utils/
│   │   │   ├── driftAlgorithm.ts   # Mental Drift Engine Logic
│   │   │   └── frameAlgorithm.ts   # Frame Engine Cinematic Logic
│   │   └── server.ts              # Express API Server
│   ├── scripts/
│   │   ├── evaluateFrameEngine.ts  # Frame Engine Benchmark
│   │   └── evaluateMTGJamendo.ts   # High-Scale Performance Benchmark
│   └── tests/fixtures/            # Music Dataset Fixtures (MusAV & MTG-Jamendo)
└── frontend/                 # Web User Interface (Next.js & React)
```

---

## 🛡️ License & Acknowledgments

* Powered by **YouTube Data API v3** & **MusAV / MTG-Jamendo** open music audio feature datasets.
* Designed with modern web standards and high-performance TypeScript logic.

**Enjoy seamless, perfectly sequenced music with TuneIt! 🎧✨**
