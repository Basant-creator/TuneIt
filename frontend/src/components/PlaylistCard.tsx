'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';
import { Sparkles, ArrowRight } from 'lucide-react';

interface TrackItem {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  key: string;
  energy: number;
  coverUrl: string;
}

interface PlaylistCardProps {
  title: string;
  description?: string;
  tracks: TrackItem[];
  variant?: 'chaotic' | 'optimized';
  className?: string;
  onFixFlow?: () => void;
}

export function PlaylistCard({
  title,
  description,
  tracks,
  variant = 'chaotic',
  className,
  onFixFlow,
}: PlaylistCardProps) {
  const isChaotic = variant === 'chaotic';

  return (
    <div
      className={cn(
        'neo-border neo-shadow p-6 rounded-2xl flex flex-col h-full',
        isChaotic ? 'bg-white' : 'bg-brand-pink text-white',
        className
      )}
    >
      {/* Header Tag */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <span
          className={cn(
            'neo-border px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider',
            isChaotic ? 'bg-brand-orange text-white' : 'bg-brand-yellow text-black'
          )}
        >
          {isChaotic ? 'Chaotic Order' : 'Optimized Journey'}
        </span>
        
        {!isChaotic && (
          <div className="flex items-center gap-1 text-brand-yellow">
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            <span className="text-xs font-extrabold uppercase">Flow Score: 98%</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          'text-2xl font-black mb-2 tracking-tight uppercase leading-none',
          isChaotic ? 'text-black' : 'text-white'
        )}
      >
        {title}
      </h3>
      
      {description && (
        <p
          className={cn(
            'text-xs mb-6 font-medium leading-relaxed font-mono',
            isChaotic ? 'text-slate-600' : 'text-brand-yellow'
          )}
        >
          {description}
        </p>
      )}

      {/* Track List */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1 no-scrollbar">
        {tracks.map((track, idx) => {
          // Calculate transition gap for sequenced flow
          const nextTrack = tracks[idx + 1];
          const hasGap = !isChaotic && nextTrack;
          const bpmGap = hasGap ? Math.abs(track.bpm - nextTrack.bpm) : 0;
          const keyCompatible = hasGap && (track.key === nextTrack.key || track.key.slice(0, -1) === nextTrack.key.slice(0, -1));

          return (
            <div key={track.id} className="relative">
              <div
                className={cn(
                  'neo-border p-3 rounded-xl flex items-center justify-between gap-4 transition-transform hover:scale-[1.01]',
                  isChaotic ? 'bg-slate-50 border-black' : 'bg-white text-black border-black'
                )}
              >
                {/* Left - Index and Cover Art */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm neo-border shrink-0',
                      isChaotic ? 'bg-white text-black' : 'bg-brand-pink text-white'
                    )}
                  >
                    {idx + 1}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={track.coverUrl}
                    alt={track.name}
                    className="w-10 h-10 rounded-lg object-cover neo-border shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm truncate leading-none mb-1">
                      {track.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate leading-none">
                      {track.artist}
                    </p>
                  </div>
                </div>

                {/* Right - Energy / BPM and Keys */}
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div className="font-mono">
                    <p className="text-xs font-black text-brand-orange">{track.bpm} BPM</p>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded border border-black">
                      {track.key}
                    </span>
                  </div>
                  
                  {/* Energy progression meter */}
                  <div className="w-12 hidden sm:flex flex-col gap-1">
                    <div className="text-[9px] font-extrabold uppercase text-slate-400">Energy</div>
                    <div className="h-2 w-full bg-slate-200 rounded border border-black overflow-hidden relative">
                      <div
                        className={cn(
                          'h-full absolute left-0 top-0',
                          track.energy > 0.7 ? 'bg-brand-pink' : track.energy > 0.4 ? 'bg-brand-orange' : 'bg-brand-blue'
                        )}
                        style={{ width: `${track.energy * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Inter-track transitions indicators for Optimized journey */}
              {hasGap && (
                <div className="my-2 ml-14 flex items-center gap-2 text-xs font-black uppercase text-brand-yellow font-mono">
                  <ArrowRight className="w-3.5 h-3.5 rotate-90 stroke-[3px]" />
                  <span className="bg-black text-white px-2 py-0.5 rounded border border-white text-[10px]">
                    Gap: {bpmGap} BPM
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded border text-[10px]',
                      keyCompatible ? 'bg-brand-blue text-black border-black' : 'bg-brand-orange text-white border-white'
                    )}
                  >
                    {keyCompatible ? 'Perfect Key Match' : 'Key Pivot'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Button for Chaotic Card */}
      {isChaotic && onFixFlow && (
        <button
          onClick={onFixFlow}
          className="neo-border neo-shadow-sm mt-6 w-full bg-brand-yellow hover:bg-brand-yellow/90 text-black font-extrabold uppercase py-3 rounded-xl transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000000]"
        >
          Fix Playlist Flow
        </button>
      )}
    </div>
  );
}
