'use client';

import * as React from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, Volume2, ListRestart, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/utils/cn';
import { chaoticTracks, optimizedTracks, flowModes } from '@/data/homeData';
import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';
import { DoodleElement } from '@/components/DoodleElement';
import { PlaylistCard } from '@/components/PlaylistCard';
import { FlowModeCard } from '@/components/FlowModeCard';
import { EnergyGraph } from '@/components/EnergyGraph';
import { HeroVisualization } from '@/components/HeroVisualization';
import { CTASection } from '@/components/CTASection';
import { FlowSandbox } from '@/components/FlowSandbox';
import { env } from '@/lib/env';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'chaotic' | 'optimized'>('chaotic');
  const [selectedFlow, setSelectedFlow] = React.useState('bu');
  const [selectedTrackIdsByMode, setSelectedTrackIdsByMode] = React.useState<Record<string, string[]>>({
    bu: ['r1', 'r2', 'r3', 'r4', 'r5'],
    df: ['d1', 'd2', 'd3', 'd4', 'd5'],
    ph: ['u1', 'u2', 'u3', 'u4', 'u5'],
    cm: ['f1', 'f2', 'f3', 'f4', 'f5'],
  });

  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [playlists, setPlaylists] = React.useState<any[]>([]);

  React.useEffect(() => {
    // ELIMINATE HARDCODED DEV URLS: Safe centralized environment variable URL lookup
    fetch(`${env.apiUrl}/api/me`)
      .then((res) => {
        if (!res.ok) throw new Error('Unauthenticated');
        return res.json();
      })
      .then((profile) => {
        console.log('[TuneIt Backend] Connected! Profile:', profile);
        setUserProfile(profile);
        return fetch(`${env.apiUrl}/api/playlists`);
      })
      .then((res) => (res ? res.json() : null))
      .then((playlistsData) => {
        if (playlistsData && playlistsData.items) {
          console.log('[TuneIt Backend] Playlists fetched:', playlistsData.items);
          setPlaylists(playlistsData.items);
        }
      })
      .catch((err) => {
        console.log('[TuneIt Backend] No active session or connection failed:', err.message);
      });
  }, []);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });

  const x = useTransform(scrollYProgress, [0.1, 0.9], ['0%', '-75%']);

  const fixPlaylistFlow = () => {
    setActiveTab('optimized');
  };

  const handleGetStarted = () => {
    if (userProfile) {
      router.push('/playlists');
    } else {
      window.location.href = `${env.apiUrl}/auth/login`;
    }
  };

  const resetPlaylistFlow = () => {
    setActiveTab('chaotic');
  };

  return (
    <div className="min-h-screen bg-[#F8FFE5] text-black relative pb-16">

      {/* 1. STYLISH NAVBAR */}
      {/* Centralized styling: replaced border-b-3 border-black with unified neo-border-b class */}
      <header className="w-full py-5 px-6 md:px-12 neo-border-b bg-white flex items-center justify-between sticky top-0 z-50 select-none">
        <div className="flex items-center gap-2">
          {/* Centralized styling: replaced border-2 border-black with neo-border-sm */}
          <div className="w-10 h-10 rounded-xl bg-brand-pink neo-border-sm flex items-center justify-center shadow-sm transform -rotate-3 shrink-0">
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight uppercase font-heading select-none">
            TuneIt
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 font-mono font-black text-sm uppercase">
          <a href="#transformation" className="hover:text-brand-pink transition-colors">Flow Fixer</a>
          <a href="#modes" className="hover:text-brand-blue transition-colors">Modes</a>
          <a href="#how-it-works" className="hover:text-brand-orange transition-colors">How It Works</a>
        </nav>

        <div className="flex items-center gap-3">
          {userProfile ? (
            /* Centralized styling: removed redundant border-black utility since neo-border handles black border natively */
            <div className="flex items-center gap-2 bg-[#F8FFE5] neo-border px-3.5 py-1.5 rounded-xl select-none">
              {userProfile.images?.[0]?.url && (
                <img
                  src={userProfile.images[0].url}
                  alt={userProfile.display_name}
                  className="w-6 h-6 rounded-full neo-border-sm"
                />
              )}
              <span className="font-mono text-xs font-black text-black">
                {userProfile.display_name || 'YouTube Music Active'} ⚡
              </span>
            </div>
          ) : (
            <a href={`${env.apiUrl}/auth/login`}>
              <NeoButton color="yellow" size="sm" className="hidden sm:inline-flex">
                Connect YouTube Music ⚡
              </NeoButton>
            </a>
          )}
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative py-16 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        {/* Floating background squiggles */}
        <div className="absolute top-8 left-1/4 w-12 h-12 text-brand-orange opacity-20 pointer-events-none hidden md:block">
          <DoodleElement type="squiggle" />
        </div>
        <div className="absolute bottom-16 left-12 w-14 h-14 text-brand-pink opacity-20 pointer-events-none hidden md:block">
          <DoodleElement type="musicNote" />
        </div>
        <div className="absolute top-1/3 right-[5%] w-24 h-24 opacity-90 pointer-events-none hidden lg:block z-20 transform -rotate-12 hover:scale-110 transition-transform duration-300">
          <img src="/graphics/Happy cup.svg" alt="Happy Cup" className="w-full h-full drop-shadow-md" />
        </div>

        {/* Hero Left Content */}
        <div className="lg:col-span-6 space-y-6 text-left relative">

          {/* Top handwritten sticker */}
          <div className="inline-block relative">
            <Sticker color="pink" rotation={-4} size="md">
              {"🎵 IT'S NOT THE SONGS, IT'S THE ORDER!"}
            </Sticker>
          </div>

          {/* Hero Main Headline */}
          {/* Centralized styling: replaced border-3 border-black with neo-border */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-none text-black">
            Stop being a <br />
            <span className="bg-brand-yellow px-2 py-0.5 inline-block neo-border rounded-xl transform rotate-1">Passive Listener.</span>
          </h1>

          {/* Hero Supporting copy */}
          <p className="text-sm sm:text-base font-extrabold font-mono text-slate-700 leading-relaxed max-w-xl">
            Every playlist has potentials, yours as well. Use us to bring out the best version your playlist can be.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <NeoButton color="orange" size="lg" onClick={handleGetStarted}>
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 stroke-[3px]" />
            </NeoButton>

            <NeoButton color="white" size="lg">
              <span>Watch Demo</span>
            </NeoButton>
          </div>

          {/* Micro annotations */}
          <div className="pt-4 flex items-center gap-6 font-mono text-xs font-black text-slate-500">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-pink fill-current" />
              100% Free Wireframe
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-brand-orange fill-current" />
              Handcrafted in Neo-Brutalism
            </span>
          </div>

        </div>

        {/* Hero Right Visual Showcase */}
        <div className="lg:col-span-6 flex justify-center relative">
          {/* Handwritten sticker pointing to visual */}
          <div className="absolute -top-6 right-12 z-30 hidden md:block">
            <Sticker color="blue" rotation={5} size="sm">
              Click to fix! ⚡
            </Sticker>
          </div>

          <HeroVisualization />
        </div>

      </section>

      {/* Decorative Squiggle Divider */}
      <div className="w-full flex items-center justify-center my-10 max-w-4xl mx-auto px-6">
        <DoodleElement type="squiggle" color="#000000" className="w-full h-10 opacity-30" />
      </div>

      {/* 3. PLAYLIST TRANSFORMATION STORYTELLING SECTION */}
      <section id="transformation" className="py-16 px-6 max-w-7xl mx-auto relative select-none">

        {/* Absolute annotations */}
        <div className="absolute top-12 right-12 w-16 h-16 text-brand-yellow opacity-45 pointer-events-none hidden md:block">
          <DoodleElement type="sparkle" />
        </div>
        <div className="absolute top-28 left-6 w-40 h-40 opacity-25 pointer-events-none hidden lg:block z-0 transform -rotate-6">
          <img src="/graphics/Spongebob-doodlebob-black 1.svg" alt="Doodlebob" className="w-full h-full" />
        </div>

        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <Sticker color="orange" rotation={-2} size="sm">
            ⚠️ BEFORE vs AFTER
          </Sticker>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
            Stop giving yourself whiplash
          </h2>

          <p className="text-xs sm:text-sm font-bold font-mono text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {"Whiplash happens when you go from a 128 BPM progressive banger straight into a 90 BPM lo-fi beat. Let's compare how TuneIt rearranges the exact same tracks into a smooth sonic transition."}
          </p>

          {/* Manual switch tabs */}
          <div className="inline-flex neo-border p-2 bg-white rounded-2xl shadow-sm mt-4">
            <button
              onClick={resetPlaylistFlow}
              className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${activeTab === 'chaotic' ? 'bg-brand-orange text-white neo-border' : 'text-black'
                }`}
            >
              1. Chaotic Sequence
            </button>
            <button
              onClick={fixPlaylistFlow}
              className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${activeTab === 'optimized' ? 'bg-brand-blue text-black neo-border' : 'text-black'
                }`}
            >
              2. Optimized Flow ⚡
            </button>
          </div>
        </div>

        {/* Side-by-side Twin Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8">

          {/* Card list rendering depending on active tab */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {activeTab === 'chaotic' ? (
                <motion.div
                  key="chaotic-card"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <PlaylistCard
                    title="Chaotic Beach Sunset"
                    description="This playlist contains absolute bangers, but they are arranged randomly by an algorithm that has no ears."
                    tracks={chaoticTracks}
                    variant="chaotic"
                    onFixFlow={fixPlaylistFlow}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="optimized-card"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <PlaylistCard
                    title="Optimized Beach Sunset 🌊"
                    description="The exact same tracks, rearranged to build energy gradually and ensure seamless harmonic chord matches."
                    tracks={optimizedTracks}
                    variant="optimized"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Graph visual rendering dynamically based on state */}
          <div className="lg:col-span-6 flex flex-col">
            <EnergyGraph activeMode={activeTab} className="flex-1" />

            {/* Quick interactive note under the graph */}
            {/* Centralized styling: removed redundant border-black class since neo-border style defaults to black */}
            <div className="neo-border rounded-xl p-4 bg-white mt-4 font-mono text-xs font-black flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ListRestart className="w-4 h-4 text-brand-pink" />
                <span>Compare momentum changes instantly.</span>
              </span>

              {activeTab === 'optimized' && (
                <button
                  onClick={resetPlaylistFlow}
                  className="text-brand-orange hover:underline font-extrabold uppercase"
                >
                  Reset Flow 🔄
                </button>
              )}
            </div>
          </div>

        </div>

      </section>

      {/* Decorative arrow doodle pointing down */}
      <div className="w-full flex justify-center my-6 hidden lg:flex">
        <div className="w-16 h-16 rotate-90 text-brand-pink">
          <DoodleElement type="arrow" />
        </div>
      </div>

      {/* 4. FLOW MODES PREVIEW WITH FULL SCREEN HORIZONTAL SCROLL */}
      <section
        id="modes"
        ref={containerRef}
        className="relative w-full h-[400vh] select-none"
      >
        {/* Centralized styling: replaced border-b-3 border-black with neo-border-b */}
        <div className="sticky top-[80px] h-[calc(100vh-80px)] overflow-hidden flex flex-col justify-center bg-white neo-border-b">

          <motion.div
            style={{ x }}
            className="flex w-[400vw] h-full"
          >
            {flowModes.map((mode, idx) => {
              return (
                <div
                  key={mode.id}
                  className={cn(
                    "w-screen h-full flex-shrink-0 flex items-center justify-center px-6 md:px-20 py-8 relative",
                    /* CLEAN UP INLINE LOOKUP DICTIONARIES: abstracted styles mapping into the central homeData layer */
                    mode.bgClass
                  )}
                >
                  <div className="w-full max-w-7xl h-[85%] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                    {/* Left Column: White Neo-Brutalist Card */}
                    <div className="lg:col-span-5 flex flex-col justify-center">
                      <div className="bg-white text-black neo-border neo-shadow-lg rounded-3xl p-6 sm:p-8 flex flex-col justify-between w-full max-w-lg min-h-[460px] hover:translate-y-[-2px] transition-all">

                        {/* Centralized styling: replaced border-b-3 border-black with neo-border-b */}
                        <div className="flex items-center justify-between neo-border-b pb-4 mb-4 select-none">
                          <span className="neo-border px-3 py-1 text-xs font-black uppercase rounded-lg bg-black text-white">
                            FLOW ARCHETYPE 0{idx + 1}
                          </span>
                          {selectedFlow === mode.id && (
                            <span className="text-xs font-mono font-black text-brand-pink uppercase tracking-wide flex items-center gap-1">
                              ✦ Active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3.5 mb-4">
                          <div className="w-12 h-12 rounded-xl neo-border bg-brand-yellow text-black flex items-center justify-center text-2xl shadow-sm transform -rotate-6 select-none shrink-0">
                            {mode.emoji}
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                            {mode.title}
                          </h3>
                        </div>

                        <p className="text-xs sm:text-sm font-bold font-mono text-slate-700 leading-relaxed mb-6">
                          {mode.description}
                        </p>

                        <div className="space-y-3 font-mono text-xs font-black mb-6">
                          {mode.features.map((feature, fIdx) => (
                            /* Centralized styling: replaced border-2 border-black with neo-border-sm */
                            <div key={fIdx} className="flex items-center gap-2 bg-slate-50 neo-border-sm rounded-lg p-2.5 shadow-sm">
                              {/* Centralized styling: replaced border border-black with neo-border-xs */}
                              <span className="w-4 h-4 rounded-full bg-brand-pink neo-border-xs flex items-center justify-center text-[8px] text-white font-black shrink-0">
                                ✦
                              </span>
                              <span className="truncate">{feature}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setSelectedFlow(mode.id)}
                          className={cn(
                            "w-full py-3 neo-border rounded-xl font-black uppercase text-xs tracking-wider transition-all select-none",
                            selectedFlow === mode.id
                              ? "bg-black text-white translate-y-[2px] shadow-none"
                              : "bg-brand-yellow text-black hover:translate-y-[-2px] hover:shadow-md active:translate-y-[2px]"
                          )}
                        >
                          {selectedFlow === mode.id ? "✓ Active Selection" : "Activate Flow ⚡"}
                        </button>

                      </div>
                    </div>

                    {/* Right Column: Doodle Canvas container */}
                    {/* Centralized styling: replaced border-3 border-black with neo-border */}
                    <div className="lg:col-span-7 h-full w-full flex items-center justify-center relative min-h-[300px] lg:min-h-0">
                      <div className="w-full h-full rounded-3xl neo-border neo-shadow-lg bg-white relative overflow-hidden bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:16px_16px] p-6 flex flex-col justify-between">

                        <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-3 select-none">
                          <span className="font-mono text-[9px] font-black uppercase text-slate-400">
                            Viewport Canvas // 0{idx + 1}
                          </span>
                          <span className="font-mono text-[9px] font-black uppercase text-slate-400">
                            Flow Sandbox ✦
                          </span>
                        </div>

                        <div className="flex-1 mt-3 overflow-hidden flex flex-col justify-between">
                          <FlowSandbox
                            modeId={mode.id}
                            selectedTrackIds={selectedTrackIdsByMode[mode.id] || []}
                            onChangeSelected={(ids) => {
                              setSelectedTrackIdsByMode((prev) => ({
                                ...prev,
                                [mode.id]: ids,
                              }));
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between select-none">
                          <span className="font-mono text-[9px] font-black uppercase text-slate-400">
                            tuneit.labs/modes
                          </span>
                          <span className="font-mono text-[9px] font-black uppercase text-slate-400">
                            {mode.title}
                          </span>
                        </div>

                      </div>
                    </div>

                  </div>

                  {idx < flowModes.length - 1 && (
                    <div className="absolute top-0 bottom-0 -right-[38px] w-[40px] h-full pointer-events-none z-40">
                      <svg
                        viewBox="0 0 40 1440"
                        preserveAspectRatio="none"
                        className="w-full h-full filter drop-shadow-[2px_0_0_rgba(0,0,0,1)]"
                      >
                        {/* Fill path */}
                        <path
                          d="M 0 0 L 0 1440 L 8 1440 C 8 1410, 28 1400, 28 1380 C 28 1360, 8 1350, 8 1320 C 8 1290, 20 1280, 20 1260 C 20 1240, 8 1230, 8 1200 C 8 1170, 38 1160, 38 1140 C 38 1120, 8 1110, 8 1080 C 8 1050, 16 1040, 16 1020 C 16 1000, 8 990, 8 960 C 8 930, 30 920, 30 900 C 30 880, 8 870, 8 840 C 8 810, 38 800, 38 780 C 38 760, 8 750, 8 720 C 8 690, 22 680, 22 660 C 22 640, 8 630, 8 600 C 8 570, 32 560, 32 540 C 32 520, 8 510, 8 480 C 8 450, 18 440, 18 420 C 18 400, 8 390, 8 360 C 8 330, 38 320, 38 300 C 38 280, 8 270, 8 240 C 8 210, 26 200, 26 180 C 26 160, 8 150, 8 120 C 8 90, 34 80, 34 60 C 34 40, 8 30, 8 0 L 0 0 Z"
                          /* CLEAN UP INLINE LOOKUP DICTIONARIES: Replaced messy inline fill configuration object mapping with direct property call */
                          fill={mode.svgFillColor}
                        />
                        {/* Stroke path */}
                        <path
                          d="M 8 1440 C 8 1410, 28 1400, 28 1380 C 28 1360, 8 1350, 8 1320 C 8 1290, 20 1280, 20 1260 C 20 1240, 8 1230, 8 1200 C 8 1170, 38 1160, 38 1140 C 38 1120, 8 1110, 8 1080 C 8 1050, 16 1040, 16 1020 C 16 1000, 8 990, 8 960 C 8 930, 30 920, 30 900 C 30 880, 8 870, 8 840 C 8 810, 38 800, 38 780 C 38 760, 8 750, 8 720 C 8 690, 22 680, 22 660 C 22 640, 8 630, 8 600 C 8 570, 32 560, 32 540 C 32 520, 8 510, 8 480 C 8 450, 18 440, 18 420 C 18 400, 8 390, 8 360 C 8 330, 38 320, 38 300 C 38 280, 8 270, 8 240 C 8 210, 26 200, 26 180 C 26 160, 8 150, 8 120 C 8 90, 34 80, 34 60 C 34 40, 8 30, 8 0"
                          fill="none"
                          stroke="black"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>

        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 px-6 max-w-7xl mx-auto relative select-none">

        <div className="absolute top-1/2 left-8 w-16 h-16 text-brand-pink opacity-25 pointer-events-none hidden md:block">
          <DoodleElement type="musicNote" />
        </div>

        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <Sticker color="yellow" rotation={-3} size="sm">
            🛠️ SIMPLE AS 1-2-3
          </Sticker>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
            How TuneIt Fixes The Flow
          </h2>

          <p className="text-xs sm:text-sm font-bold font-mono text-slate-600 max-w-2xl mx-auto leading-relaxed">
            No manual DJ editing or audio production experience required. Our intelligent sequencing algorithm analyzes files instantly.
          </p>
        </div>

        {/* Visual 3-step row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">

          {/* Step 1 */}
          <div className="neo-border neo-shadow p-6 rounded-2xl bg-white relative flex flex-col h-full hover:translate-y-[-2px] transition-transform">
            <div className="w-12 h-12 rounded-xl neo-border bg-brand-pink text-white flex items-center justify-center font-black text-xl shadow-sm mb-4 transform -rotate-6">
              1
            </div>
            <img src="/graphics/computer.svg" alt="Computer" className="absolute top-4 right-4 w-20 h-20 opacity-90 transform rotate-6 pointer-events-none" />
            <h4 className="text-lg font-black uppercase mb-2">Import Playlist</h4>
            <p className="text-xs font-mono font-medium text-slate-700 leading-relaxed">
              Connect your Spotify in one click. We analyze the Camelot harmonic keys, BPM tempos, and energy levels of your existing tracks.
            </p>
          </div>

          {/* Step 2 */}
          <div className="neo-border neo-shadow p-6 rounded-2xl bg-white relative flex flex-col h-full hover:translate-y-[-2px] transition-transform">
            <div className="w-12 h-12 rounded-xl neo-border bg-brand-blue text-black flex items-center justify-center font-black text-xl shadow-sm mb-4 transform rotate-3">
              2
            </div>
            <img src="/graphics/Group (1).svg" alt="Process" className="absolute top-4 right-4 w-16 h-16 opacity-90 transform -rotate-3 pointer-events-none" />
            <h4 className="text-lg font-black uppercase mb-2">Choose Flow Curve</h4>
            <p className="text-xs font-mono font-medium text-slate-700 leading-relaxed">
              Select one of our 5 standard journey curves or let our engine recommend the best starting track to kick off the progression.
            </p>
          </div>

          {/* Step 3 */}
          <div className="neo-border neo-shadow p-6 rounded-2xl bg-white relative flex flex-col h-full hover:translate-y-[-2px] transition-transform">
            <div className="w-12 h-12 rounded-xl neo-border bg-brand-yellow text-black flex items-center justify-center font-black text-xl shadow-sm mb-4 transform -rotate-3">
              3
            </div>
            <img src="/graphics/Paper plane.svg" alt="Paper plane" className="absolute top-4 right-4 w-16 h-16 opacity-90 transform rotate-12 pointer-events-none" />
            <h4 className="text-lg font-black uppercase mb-2">Export Journey</h4>
            <p className="text-xs font-mono font-medium text-slate-700 leading-relaxed">
              Save the newly structured playlist back to your Spotify profile instantly. We never alter your original song files.
            </p>
          </div>

        </div>

      </section>

      {/* 6. FINAL CALL TO ACTION */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <CTASection />
      </section>

    </div>
  );
}
