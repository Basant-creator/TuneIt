'use client';

import * as React from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Volume2,
  ListRestart,
  Heart,
} from 'lucide-react';

import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';
import { DoodleElement } from '@/components/DoodleElement';
import { PlaylistCard } from '@/components/PlaylistCard';
import { FlowModeCard } from '@/components/FlowModeCard';
import { EnergyGraph } from '@/components/EnergyGraph';
import { HeroVisualization } from '@/components/HeroVisualization';
import { CTASection } from '@/components/CTASection';

// Mock songs list representing chaotic order
const chaoticTracks = [
  {
    id: 't1',
    name: 'Strobe',
    artist: 'deadmau5',
    bpm: 128,
    key: '10A',
    energy: 0.72,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120',
  },
  {
    id: 't2',
    name: 'Innerbloom',
    artist: 'RÜFÜS DU SOL',
    bpm: 122,
    key: '8A',
    energy: 0.58,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120',
  },
  {
    id: 't3',
    name: 'Opus',
    artist: 'Eric Prydz',
    bpm: 126,
    key: '8B',
    energy: 0.84,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=120',
  },
  {
    id: 't4',
    name: 'Language',
    artist: 'Porter Robinson',
    bpm: 128,
    key: '8B',
    energy: 0.89,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120',
  },
];

// Mock songs list rearranged into optimized journey
const optimizedTracks = [
  {
    id: 't2',
    name: 'Innerbloom',
    artist: 'RÜFÜS DU SOL',
    bpm: 122,
    key: '8A',
    energy: 0.58,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120',
  },
  {
    id: 't3',
    name: 'Opus',
    artist: 'Eric Prydz',
    bpm: 126,
    key: '8B',
    energy: 0.84,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=120',
  },
  {
    id: 't4',
    name: 'Language',
    artist: 'Porter Robinson',
    bpm: 128,
    key: '8B',
    energy: 0.89,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120',
  },
  {
    id: 't1',
    name: 'Strobe',
    artist: 'deadmau5',
    bpm: 128,
    key: '10A',
    energy: 0.72,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120',
  },
];

const flowModes = [
  {
    id: 'bu',
    emoji: '🚀',
    title: 'Build Up',
    description: 'Gradually increase tempo and density. Ideal for building high-energy momentum throughout your set.',
    color: 'pink' as const,
  },
  {
    id: 'df',
    emoji: '🌊',
    title: 'Drift',
    description: 'Smooth, atmospheric transitions that preserve mood and ambient energy levels without sharp drops.',
    color: 'blue' as const,
  },
  {
    id: 'ph',
    emoji: '⚡',
    title: 'Peak Hour',
    description: 'Keeps energy at maximum levels. Transitions optimized specifically for heavy basslines and drops.',
    color: 'orange' as const,
  },
  {
    id: 'cm',
    emoji: '🎭',
    title: 'Cinematic',
    description: 'Large, theatrical sweeps with custom tension arcs, dynamic tempo shifts, and intense build-up sections.',
    color: 'white' as const,
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = React.useState<'chaotic' | 'optimized'>('chaotic');
  const [selectedFlow, setSelectedFlow] = React.useState('bu');

  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });

  const [translateX, setTranslateX] = React.useState('-30%');

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setTranslateX('-60%');
      } else if (window.innerWidth < 1024) {
        setTranslateX('-40%');
      } else {
        setTranslateX('-22%');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const x = useTransform(scrollYProgress, [0.1, 0.9], ['0%', translateX]);

  const fixPlaylistFlow = () => {
    setActiveTab('optimized');
  };

  const resetPlaylistFlow = () => {
    setActiveTab('chaotic');
  };

  return (
    <div className="min-h-screen bg-[#F8FFE5] text-black overflow-x-hidden relative pb-16">
      
      {/* 1. STYLISH NAVBAR */}
      <header className="w-full py-5 px-6 md:px-12 border-b-3 border-black bg-white flex items-center justify-between sticky top-0 z-50 select-none">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-brand-pink border-2 border-black flex items-center justify-center shadow-sm transform -rotate-3 shrink-0">
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
          <NeoButton color="yellow" size="sm" className="hidden sm:inline-flex">
            Connect Spotify ⚡
          </NeoButton>
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

        {/* Hero Left Content */}
        <div className="lg:col-span-6 space-y-6 text-left relative">
          
          {/* Top handwritten sticker */}
          <div className="inline-block relative">
            <Sticker color="pink" rotation={-4} size="md">
              {"🎵 IT'S NOT THE SONGS, IT'S THE ORDER!"}
            </Sticker>
          </div>

          {/* Hero Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-none text-black">
            YOUR PLAYLIST <br />
            HAS <span className="bg-brand-yellow px-2 py-0.5 inline-block border-3 border-black rounded-xl transform rotate-1">NO FLOW.</span>
          </h1>

          {/* Hero Supporting copy */}
          <p className="text-sm sm:text-base font-extrabold font-mono text-slate-700 leading-relaxed max-w-xl">
            TuneIt transforms chaotic playlists into intentional listening journeys. We intelligently sequence your tracks based on harmonic key compatibility, tempo flow, and energy curves.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <NeoButton color="orange" size="lg" onClick={fixPlaylistFlow}>
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

        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <Sticker color="orange" rotation={-2} size="sm">
            ⚠️ BEFORE vs AFTER
          </Sticker>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
            Stop giving your listeners whiplash
          </h2>
          
          <p className="text-xs sm:text-sm font-bold font-mono text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {"Whiplash happens when you go from a 128 BPM progressive banger straight into a 90 BPM lo-fi beat. Let's compare how TuneIt rearranges the exact same tracks into a smooth sonic transition."}
          </p>

          {/* Manual switch tabs */}
          <div className="inline-flex neo-border p-2 bg-white rounded-2xl shadow-sm mt-4">
            <button
              onClick={resetPlaylistFlow}
              className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${
                activeTab === 'chaotic' ? 'bg-brand-orange text-white neo-border' : 'text-black'
              }`}
            >
              1. Chaotic Sequence
            </button>
            <button
              onClick={fixPlaylistFlow}
              className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${
                activeTab === 'optimized' ? 'bg-brand-blue text-black neo-border' : 'text-black'
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
            <div className="neo-border rounded-xl p-4 bg-white mt-4 font-mono text-xs font-black flex items-center justify-between border-black">
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

      {/* 4. FLOW MODES PREVIEW WITH PREMIUM VERTICAL-TO-HORIZONTAL SCROLL */}
      <section 
        id="modes" 
        ref={containerRef} 
        className="relative w-full h-[220vh] select-none"
      >
        <div className="sticky top-[80px] h-[calc(100vh-80px)] overflow-hidden flex flex-col justify-center bg-[#F8FFE5]">
          
          {/* Static section header pinned at the top */}
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-4 px-6 shrink-0">
            <Sticker color="blue" rotation={3} size="sm">
              🚀 JOURNEY ARCHETYPES
            </Sticker>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
              Choose Your Listening Journey
            </h2>
            
            <p className="text-xs sm:text-sm font-bold font-mono text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Not every listening session is built the same. Whether you are hitting a heavy peak-hour workout, floating on a progressive sunset, or diving into dramatic cinematic arcs, we have a flow curve specifically designed for it.
            </p>
          </div>

          {/* Horizontal scrollable cards track */}
          <div className="w-full overflow-hidden flex items-center relative py-4">
            <motion.div 
              style={{ x }} 
              className="flex gap-8 px-6 md:px-24 w-max"
            >
              {flowModes.map((mode) => (
                <div 
                  key={mode.id} 
                  className="w-[280px] sm:w-[320px] shrink-0 h-[280px] sm:h-[300px]"
                >
                  <FlowModeCard
                    emoji={mode.emoji}
                    title={mode.title}
                    description={mode.description}
                    color={mode.color}
                    selected={selectedFlow === mode.id}
                    onClick={() => setSelectedFlow(mode.id)}
                  />
                </div>
              ))}
            </motion.div>
          </div>

          {/* Details sticker for currently active flow mode */}
          <div className="mt-8 flex justify-center px-6 shrink-0">
            <Sticker color="white" rotation={-1} size="md" className="text-sm font-mono max-w-xl text-center">
              💡 Active Selection: <span className="text-brand-pink font-extrabold uppercase">{flowModes.find(m => m.id === selectedFlow)?.title}</span> curve guarantees smooth transitions!
            </Sticker>
          </div>

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
