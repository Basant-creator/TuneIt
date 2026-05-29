'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Volume2 } from 'lucide-react';

interface SimpleTrack {
  name: string;
  artist: string;
  bpm: number;
  key: string;
  coverUrl: string;
}

interface TransitionCardProps {
  trackA: SimpleTrack;
  trackB: SimpleTrack;
  bpmDelta: number;
  keyCompatible: boolean;
  score: number;
  className?: string;
}

export function TransitionCard({
  trackA,
  trackB,
  bpmDelta,
  keyCompatible,
  score,
  className,
}: TransitionCardProps) {
  return (
    <div className={cn('flex flex-col items-center w-full max-w-lg', className)}>
      {/* Track A Card */}
      <div className="neo-border w-full p-3 rounded-xl bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trackA.coverUrl} alt={trackA.name} className="w-10 h-10 rounded-lg object-cover neo-border shrink-0" />
          <div className="min-w-0">
            <h5 className="font-extrabold text-sm truncate leading-none mb-1">{trackA.name}</h5>
            <p className="text-xs text-slate-500 truncate leading-none">{trackA.artist}</p>
          </div>
        </div>
        <div className="text-right shrink-0 font-mono">
          <p className="text-xs font-black text-brand-orange">{trackA.bpm} BPM</p>
          <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-black">{trackA.key}</span>
        </div>
      </div>

      {/* Transition Gap Bracket */}
      <div className="relative my-2 w-[90%] flex flex-col items-center">
        {/* Vertical dotted connector line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 border-l-[3px] border-dashed border-black z-0" />

        {/* Transition Score Pill */}
        <motion.div
          whileHover={{ scale: 1.05, rotate: 1 }}
          className="neo-border py-2 px-4 rounded-xl bg-brand-yellow text-black z-10 font-mono text-xs flex flex-col items-center justify-center gap-1 min-w-[200px] shadow-sm relative"
        >
          <div className="flex items-center gap-1.5 font-extrabold uppercase">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Transition Score: {score}/100</span>
          </div>

          <div className="w-full flex items-center justify-between gap-4 border-t border-black/20 pt-1 mt-1 text-[9px] font-bold">
            <span className="text-brand-orange">BPM Shift: +{bpmDelta.toFixed(0)}</span>
            <span className={cn(keyCompatible ? 'text-brand-pink' : 'text-slate-500')}>
              {keyCompatible ? '🟢 Harmonic Mix' : '🟡 Key Pivot'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Track B Card */}
      <div className="neo-border w-full p-3 rounded-xl bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trackB.coverUrl} alt={trackB.name} className="w-10 h-10 rounded-lg object-cover neo-border shrink-0" />
          <div className="min-w-0">
            <h5 className="font-extrabold text-sm truncate leading-none mb-1">{trackB.name}</h5>
            <p className="text-xs text-slate-500 truncate leading-none">{trackB.artist}</p>
          </div>
        </div>
        <div className="text-right shrink-0 font-mono">
          <p className="text-xs font-black text-brand-orange">{trackB.bpm} BPM</p>
          <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-black">{trackB.key}</span>
        </div>
      </div>
    </div>
  );
}
