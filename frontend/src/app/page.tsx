'use client';

import * as React from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, ListRestart, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/utils/cn';
import { chaoticTracks, optimizedTracks, flowModes, DEFAULT_SANDBOX_PICKS } from '@/data/homeData';
import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';
import { DoodleElement } from '@/components/DoodleElement';
import { PlaylistCard } from '@/components/PlaylistCard';
import { EnergyGraph } from '@/components/EnergyGraph';
import { HeroVisualization } from '@/components/HeroVisualization';
import { CTASection } from '@/components/CTASection';
import { FlowSandbox } from '@/components/FlowSandbox';
import { Header } from '@/components/Header';
import { api } from '@/services/api';
import type { UserProfile } from '@/types/flow';

/**
 * "How it works" content. Every claim here is checked against the code: four
 * modes (not five), no "recommended starting track" feature, and no claim of
 * instant analysis — a cold 100-track playlist takes several Gemini batches.
 */
const HOW_IT_WORKS = [
  {
    title: 'Connect',
    body: 'Sign in with Google and pick a YouTube Music playlist. TuneIt only holds your session for the visit — nothing about your account is saved.',
    art: '/graphics/computer.svg',
    tilt: -1.5,
    surface: 'bg-white',
    numeral: 'var(--brand-pink)',
    placement: 'lg:col-span-5 lg:col-start-1',
  },
  {
    title: 'Pick a mood',
    body: 'Rise climbs. Drift stays calm. Unhinged throws curveballs. Frame plays out in three acts. Each track’s tempo and energy decide where it lands.',
    art: '/graphics/Group (1).svg',
    tilt: 1.2,
    surface: 'bg-brand-yellow',
    numeral: 'var(--brand-blue)',
    placement: 'lg:col-span-5 lg:col-start-5 lg:mt-28',
  },
  {
    title: 'Tweak & ship',
    body: 'Drag any song where you want it, then save the new order straight to YouTube Music, or grab a CSV and move it anywhere with Soundiiz or TuneMyMusic.',
    art: '/graphics/Paper plane.svg',
    tilt: -0.8,
    surface: 'bg-brand-pink text-black',
    numeral: 'var(--brand-yellow)',
    placement: 'lg:col-span-5 lg:col-start-8 lg:mt-56',
  },
] as const;

/** Human-readable copy for the `?auth_error=` codes the backend redirects with. */
const AUTH_ERROR_COPY: Record<string, string> = {
  access_denied: 'You declined the YouTube permission request. Nothing was connected.',
  session_expired: 'That sign-in link expired. Please connect again.',
  token_exchange_failed: 'Google rejected the sign-in. Please try connecting again.',
  missing_code: 'Google did not return an authorization code. Please try again.',
};

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'chaotic' | 'optimized'>('chaotic');
  const [selectedFlow, setSelectedFlow] = React.useState('bu');
  const [selectedTrackIdsByMode, setSelectedTrackIdsByMode] =
    React.useState<Record<string, string[]>>(() => ({ ...DEFAULT_SANDBOX_PICKS }));

  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    // Surface a failed OAuth round trip instead of silently landing on the
    // marketing page as though nothing happened. Reading `window.location` is a
    // genuine external-system subscription, and it cannot move into a lazy
    // useState initializer without desyncing from the prerendered HTML.
    const code = new URLSearchParams(window.location.search).get('auth_error');
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthError(AUTH_ERROR_COPY[code] ?? 'Could not connect to YouTube Music. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    api
      .getProfile()
      .then((profile) => {
        if (isMounted) setUserProfile(profile);
      })
      .catch(() => {
        // No session yet is the normal first-visit state, not an error.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });

  const rawX = useTransform(scrollYProgress, [0.08, 0.92], ['0%', '-75%']);
  const x = useSpring(rawX, {
    stiffness: 150,
    damping: 20,
    mass: 0.2,
    restDelta: 0.0001,
  });


  const fixPlaylistFlow = () => {
    setActiveTab('optimized');
  };

  const handleGetStarted = () => {
    if (userProfile) {
      router.push('/playlists');
    } else {
      window.location.href = api.loginUrl();
    }
  };

  const resetPlaylistFlow = () => {
    setActiveTab('chaotic');
  };

  return (
    <div className="min-h-screen bg-[#F8FFE5] text-black relative pb-16">

      {/* 1. ANIMATED STYLISH NAVBAR */}
      <Header userProfile={userProfile} detectSession />

      {/* Failed sign-in banner */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="max-w-3xl mx-auto mt-4 px-6"
          >
            <div className="bg-red-50 neo-border-sm border-red-500 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="font-mono text-xs font-black text-red-700 flex-1">{authError}</span>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="font-mono text-[10px] font-black uppercase text-red-500 hover:text-red-800 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main" tabIndex={-1} className="outline-none">
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/graphics/Happy cup.svg" alt="" aria-hidden="true" className="w-full h-full drop-shadow-md" />
        </div>

        {/* Hero Left Content */}
        <div className="lg:col-span-6 space-y-6 text-left relative">

          {/* Top handwritten sticker */}
          <div className="inline-block relative">
            <Sticker color="pink" rotation={-4} size="md">
              {"It's not the songs. It's the order."}
            </Sticker>
          </div>

          {/* Hero Main Headline */}
          {/* Centralized styling: replaced border-3 border-black with neo-border */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-none text-black">
            Stop being&nbsp;a <br />
            <span className="bg-brand-yellow px-2 py-0.5 inline-block neo-border rounded-xl transform rotate-1">Passive Listener.</span>
          </h1>

          {/* Hero Supporting copy */}
          <p className="text-sm sm:text-base font-extrabold font-mono text-slate-700 leading-relaxed max-w-xl">
            Your playlist has great songs in a terrible order. TuneIt reads each track&apos;s tempo and energy,
            then reshuffles them so every transition lands.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <NeoButton color="orange" size="lg" onClick={handleGetStarted}>
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 stroke-[3px]" />
            </NeoButton>

            {/* Was a "Watch Demo" button wired to nothing. There is no video, but
                there is a live before/after right below, so point at that. */}
            <NeoButton href="#transformation" color="white" size="lg">
              <span>See it in action</span>
            </NeoButton>
          </div>

          {/* Micro annotations */}
          <div className="pt-4 flex items-center gap-6 font-mono text-xs font-black text-slate-500">
            <span className="flex items-center gap-1.5">
              <ListRestart className="w-4 h-4 text-brand-pink" aria-hidden="true" />
              4 flow modes
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-brand-orange fill-current" aria-hidden="true" />
              Export to YouTube Music or CSV
            </span>
          </div>

        </div>

        {/* Hero Right Visual Showcase */}
        <div className="lg:col-span-6 flex justify-center relative">
          {/* Handwritten sticker pointing to visual */}
          <div className="absolute -top-6 right-12 z-30 hidden md:block">
            <Sticker color="blue" rotation={5} size="sm">
              Click to fix
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
        {/* Previously a DoodleBob illustration — a SpongeBob SquarePants character,
            which is Paramount IP and not ours to ship. */}
        <div className="absolute top-28 left-6 w-40 h-40 opacity-25 pointer-events-none hidden lg:block z-0 transform -rotate-6 text-black" aria-hidden="true">
          <DoodleElement type="wave" />
        </div>

        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <Sticker color="orange" rotation={-2} size="sm">
            BEFORE vs AFTER
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
              2. Optimized Flow
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
                    description="Four absolute bangers, shuffled by an algorithm with no ears."
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
                    title="Optimized Beach Sunset"
                    description="The exact same four tracks, reordered by the Rise engine so the energy climbs instead of lurching."
                    tracks={optimizedTracks}
                    variant="optimized"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Graph visual rendering dynamically based on state */}
          <div className="lg:col-span-6 flex flex-col">
            <EnergyGraph
              activeMode={activeTab}
              tracks={activeTab === 'chaotic' ? chaoticTracks : optimizedTracks}
              domainTracks={chaoticTracks}
              className="flex-1"
            />

            {/* Quick interactive note under the graph */}
            {/* Centralized styling: removed redundant border-black class since neo-border style defaults to black */}
            <div className="neo-border rounded-xl p-4 bg-white mt-4 font-mono text-xs font-black flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ListRestart className="w-4 h-4 text-brand-pink" />
                <span>Flip between the two orders and watch the curve.</span>
              </span>

              {activeTab === 'optimized' && (
                <button
                  onClick={resetPlaylistFlow}
                  className="text-brand-orange hover:underline font-extrabold uppercase"
                >
                  Reset Flow
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
            className="flex w-[400vw] h-full gpu-layer will-change-transform"
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
                      <div className="bg-white text-black neo-border neo-shadow-lg rounded-3xl p-6 sm:p-8 flex flex-col justify-between w-full max-w-lg min-h-[300px] hover:translate-y-[-2px] transition-all relative overflow-visible">

                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div className="flex items-center gap-3.5">
                            {mode.id === 'bu' || mode.id === 'df' || mode.id === 'ph' || mode.id === 'cm' ? (
                              <div className="w-12 h-12 flex-shrink-0 relative">
                                <div className="absolute top-[-80px] left-[-55px] w-56 h-56 z-20 pointer-events-none select-none transform -rotate-12">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={
                                      mode.id === 'bu' 
                                        ? "/graphics/ShinyHappyWeirdPoses3.svg" 
                                        : mode.id === 'df' 
                                        ? "/graphics/OpenDoodlesGroovy.svg" 
                                        : mode.id === 'ph'
                                        ? "/graphics/being-creative.svg"
                                        : "/graphics/speed-go-fast.svg"
                                    }
                                    // Decorative: the mode title is the heading right next to it.
                                    alt=""
                                    aria-hidden="true"
                                    // ~4,000px down the page and up to 100KB each; keep them
                                    // off the critical path for the hero.
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              </div>
                            ) : mode.emoji ? (
                              <div className="w-12 h-12 rounded-xl neo-border bg-brand-yellow text-black flex items-center justify-center text-2xl shadow-sm transform -rotate-6 select-none shrink-0">
                                {mode.emoji}
                              </div>
                            ) : null}
                            <h3 className={cn(
                              "text-3xl sm:text-4xl font-black uppercase tracking-tight",
                              (mode.id === 'bu' || mode.id === 'df' || mode.id === 'ph' || mode.id === 'cm') && "pl-[80px]"
                            )}>
                              {mode.title}
                            </h3>
                          </div>
                          {selectedFlow === mode.id && (
                            <span className="text-xs font-mono font-black text-brand-pink uppercase tracking-wide flex items-center gap-1 shrink-0">
                              ✦ Active
                            </span>
                          )}
                        </div>

                        <div className="space-y-3 font-mono text-xs font-black mb-6 relative z-10">
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
                            "w-full py-3 neo-border rounded-xl font-black uppercase text-xs tracking-wider transition-all select-none relative z-10",
                            selectedFlow === mode.id
                              ? "bg-black text-white translate-y-[2px] shadow-none"
                              : "bg-brand-yellow text-black hover:translate-y-[-2px] hover:shadow-md active:translate-y-[2px]"
                          )}
                        >
                          {selectedFlow === mode.id ? "✓ Active Selection" : "Activate Flow"}
                        </button>

                      </div>
                    </div>

                    {/* Right Column: Doodle Canvas container */}
                    {/* Centralized styling: replaced border-3 border-black with neo-border */}
                    <div className="lg:col-span-7 h-full w-full flex items-center justify-center relative min-h-[300px] lg:min-h-0">
                      <div className="w-full h-full rounded-3xl neo-border neo-shadow-lg bg-white relative overflow-hidden p-6 flex flex-col">

                        {/* Below lg the mode card and the sandbox share one screen,
                            leaving the sandbox ~250px: it scrolls inside itself there. */}
                        <div
                          data-lenis-prevent="true"
                          className="flex-1 overflow-y-auto overscroll-contain lg:overflow-hidden flex flex-col"
                        >
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

      {/* 5. HOW IT WORKS — staggered, not a row of three identical cards */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto relative select-none">
        <div className="absolute top-1/2 left-8 w-16 h-16 text-brand-pink opacity-25 pointer-events-none hidden md:block" aria-hidden="true">
          <DoodleElement type="musicNote" />
        </div>

        <div className="max-w-3xl mb-14 space-y-4">
          <Sticker color="yellow" rotation={-3} size="sm">
            No DJ required
          </Sticker>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-[0.92]">
            Three steps.
            <br />
            <span className="bg-brand-blue neo-border rounded-xl px-2 inline-block -rotate-1 mt-1">Zero guesswork.</span>
          </h2>
        </div>

        <ol className="relative grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-y-0 list-none m-0 p-0">
          {HOW_IT_WORKS.map((step, idx) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: idx * 0.12, type: 'spring', stiffness: 220, damping: 22 }}
              className={cn('relative', step.placement)}
            >
              {/* Stamped numeral on the card's corner. It used to sit behind the
                  card, so only its top showed and a "3" read as a "?". */}
              <motion.span
                aria-hidden="true"
                initial={{ scale: 0, rotate: -30 }}
                whileInView={{ scale: 1, rotate: step.tilt * -4 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 + idx * 0.12, type: 'spring', stiffness: 420, damping: 13 }}
                className="absolute -top-9 -left-4 z-20 text-[4.5rem] leading-none font-black select-none pointer-events-none"
                style={{ color: step.numeral, WebkitTextStroke: '3px #000', textShadow: '4px 4px 0 #000' }}
              >
                {idx + 1}
              </motion.span>

              <motion.div
                whileHover={{ y: -6, x: -3, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                style={{ rotate: step.tilt }}
                className={cn(
                  'relative z-10 neo-border rounded-2xl p-6 pt-11 pr-24 min-h-[170px] neo-shadow hover:shadow-[10px_10px_0px_0px_#000] transition-shadow gpu-layer',
                  step.surface
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.art}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="absolute top-4 right-4 w-16 h-16 pointer-events-none"
                  style={{ rotate: `${-step.tilt * 2}deg` }}
                />
                <h3 className="text-xl font-black uppercase mb-2 tracking-tight">{step.title}</h3>
                <p className="text-xs sm:text-[13px] font-mono font-semibold leading-relaxed max-w-[42ch]">
                  {step.body}
                </p>
              </motion.div>
            </motion.li>
          ))}

          {/* Hand-drawn connector, desktop only */}
          <svg
            aria-hidden="true"
            className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 1200 520"
            preserveAspectRatio="none"
          >
            <path
              d="M 360 90 C 470 60, 470 230, 560 250 S 760 330, 820 380"
              fill="none"
              stroke="#000"
              strokeWidth="3"
              strokeDasharray="9 9"
              strokeLinecap="round"
              opacity="0.35"
            />
          </svg>
        </ol>
      </section>

      {/* 6. FINAL CALL TO ACTION */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <CTASection />
      </section>
      </main>
    </div>
  );
}
