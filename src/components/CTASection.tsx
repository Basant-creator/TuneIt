'use client';

import * as React from 'react';
import { NeoButton } from './NeoButton';
import { Sticker } from './Sticker';
import { DoodleElement } from './DoodleElement';
import { Music, Star, ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="relative w-full py-20 px-6 bg-brand-orange text-white neo-border rounded-3xl overflow-hidden shadow-lg select-none">
      
      {/* Decorative absolute doodles */}
      <div className="absolute top-10 left-10 opacity-30 w-16 h-16 hidden md:block">
        <DoodleElement type="musicNote" color="#FFFFFF" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-30 w-16 h-16 hidden md:block">
        <DoodleElement type="star" color="#FFDD00" />
      </div>
      <div className="absolute top-1/2 right-12 opacity-25 w-20 h-20 rotate-12 hidden lg:block">
        <DoodleElement type="squiggle" color="#01BEFE" />
      </div>

      <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
        
        {/* Playful top note sticker */}
        <Sticker color="yellow" rotation={-3} className="mb-6">
          🔥 NO MORE BAD TRANSITIONS!
        </Sticker>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-none mb-6">
          YOUR PLAYLIST ALREADY HAS GOOD SONGS.<br />
          <span className="text-brand-yellow">THE ORDER IS THE PROBLEM.</span>
        </h2>

        {/* Supporting description */}
        <p className="text-sm sm:text-base font-bold font-mono text-brand-yellow max-w-2xl mb-10 leading-relaxed">
          Stop suffering from whiplash BPM jumps. TuneIt intelligently aligns your tracks by harmonic key, tempo curves, and energy levels to make your playlist flow like a premium DJ set.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full max-w-md">
          <NeoButton color="yellow" size="lg" className="w-full sm:w-auto">
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5 stroke-[3px]" />
          </NeoButton>
          
          <NeoButton color="white" size="lg" className="w-full sm:w-auto">
            <span>Explore Flow Modes</span>
          </NeoButton>
        </div>

        {/* Floating annotations */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs font-mono font-black text-black">
          <span className="bg-white px-3 py-1.5 rounded-lg border-2 border-black flex items-center gap-1.5">
            <Music className="w-4 h-4 text-brand-pink" />
            Spotify Integrated
          </span>
          <span className="bg-brand-blue text-black px-3 py-1.5 rounded-lg border-2 border-black flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-current text-yellow-300" />
            Zero Setup Needed
          </span>
        </div>

      </div>
    </section>
  );
}
