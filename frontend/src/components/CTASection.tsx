'use client';

import * as React from 'react';
import { NeoButton } from './NeoButton';
import { Sticker } from './Sticker';
import { DoodleElement } from './DoodleElement';
import { Music, Lock, ArrowRight } from 'lucide-react';
import { api } from '@/services/api';

export function CTASection() {
  return (
    // A <div>, not a <section>: the page already wraps this in one.
    <div className="relative w-full py-20 px-6 bg-brand-orange text-white neo-border rounded-3xl overflow-hidden neo-shadow-lg select-none">
      {/* Decorative absolute doodles */}
      <div className="absolute top-10 left-10 opacity-30 w-16 h-16 hidden md:block" aria-hidden="true">
        <DoodleElement type="musicNote" color="#FFFFFF" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-30 w-16 h-16 hidden md:block" aria-hidden="true">
        <DoodleElement type="star" color="#FFDD00" />
      </div>
      <div className="absolute top-1/2 right-12 opacity-25 w-20 h-20 rotate-12 hidden lg:block" aria-hidden="true">
        <DoodleElement type="squiggle" color="#01BEFE" />
      </div>

      <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
        <Sticker color="yellow" rotation={-3} className="mb-6">
          No more whiplash
        </Sticker>

        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-[0.95] mb-6">
          Your playlist already has good songs.
          <br />
          <span className="text-brand-yellow">The order is the problem.</span>
        </h2>

        <p className="text-sm sm:text-base font-bold font-mono text-white/95 max-w-[58ch] mb-10 leading-relaxed">
          TuneIt reads the tempo and energy of every track, then reorders them so each
          transition makes sense. Pick one of four moods, and nudge any song by hand
          afterwards if you disagree with it.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full max-w-md">
          {/* Was a hard-coded http://127.0.0.1:3001 link, which sent every
              production visitor to their own machine. */}
          <NeoButton href={api.loginUrl()} color="yellow" size="lg" className="w-full sm:w-auto">
            <span>Fix my playlist</span>
            <ArrowRight className="w-5 h-5 stroke-[3px]" aria-hidden="true" />
          </NeoButton>

          <NeoButton href="#modes" color="white" size="lg" className="w-full sm:w-auto">
            <span>See the 4 modes</span>
          </NeoButton>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs font-mono font-black text-black">
          <span className="bg-white px-3 py-1.5 rounded-lg border-2 border-black flex items-center gap-1.5 -rotate-1">
            <Music className="w-4 h-4 text-brand-pink" aria-hidden="true" />
            Works with YouTube Music
          </span>
          {/* True by construction: the only thing TuneIt writes to its database
              is anonymous track analysis. Sessions live in memory for 12 hours. */}
          <span className="bg-brand-blue text-black px-3 py-1.5 rounded-lg border-2 border-black flex items-center gap-1.5 rotate-1">
            <Lock className="w-4 h-4" aria-hidden="true" />
            No sign-up · your account is never stored
          </span>
        </div>
      </div>
    </div>
  );
}
