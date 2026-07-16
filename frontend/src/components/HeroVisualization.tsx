'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Shuffle, Check, ArrowRight } from 'lucide-react';
import { NeoButton } from './NeoButton';

interface FloatingSong {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  key: string;
  coverUrl: string;
  energy: string;
  color: string;
  // Positions in chaotic state
  chaoticPos: { x: number; y: number; rotate: number };
  // Positions in sequenced state
  sequencedPos: { x: number; y: number; rotate: number };
}

const mockSongs: FloatingSong[] = [
  {
    id: '1',
    name: 'Innerbloom',
    artist: 'RÜFÜS DU SOL',
    bpm: 122,
    key: '8A',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120',
    energy: '🌊 Chill',
    color: '#01BEFE', // blue
    chaoticPos: { x: -60, y: -90, rotate: -12 },
    sequencedPos: { x: 0, y: -120, rotate: 0 },
  },
  {
    id: '2',
    name: 'Opus',
    artist: 'Eric Prydz',
    bpm: 126,
    key: '8B',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=120',
    energy: '🚀 Build',
    color: '#FF006E', // pink
    chaoticPos: { x: 120, y: -70, rotate: 15 },
    sequencedPos: { x: 0, y: -40, rotate: 0 },
  },
  {
    id: '3',
    name: 'Language',
    artist: 'Porter Robinson',
    bpm: 128,
    key: '8B',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120',
    energy: '⚡ Peak',
    color: '#FFDD00', // yellow
    chaoticPos: { x: -110, y: 70, rotate: -8 },
    sequencedPos: { x: 0, y: 40, rotate: 0 },
  },
  {
    id: '4',
    name: 'Strobe',
    artist: 'deadmau5',
    bpm: 128,
    key: '10A',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120',
    energy: '⚡ Peak',
    color: '#F35B04', // orange
    chaoticPos: { x: 70, y: 100, rotate: 10 },
    sequencedPos: { x: 0, y: 120, rotate: 0 },
  },
];

export function HeroVisualization() {
  const [flowFixed, setFlowFixed] = React.useState(false);

  const toggleFlow = () => {
    setFlowFixed((prev) => !prev);
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      
      {/* Interactive Showcase Sandbox */}
      <div className="w-full max-w-xl h-[420px] bg-white neo-border neo-shadow-lg rounded-3xl relative overflow-hidden flex flex-col items-center justify-center p-6">
        
        {/* State Label Sticker */}
        <span className={cn(
          'absolute top-4 left-4 neo-border px-3 py-1 text-xs font-black uppercase rounded-lg shadow-sm z-30 transition-colors',
          flowFixed ? 'bg-brand-blue text-black' : 'bg-brand-orange text-white'
        )}>
          {flowFixed ? 'Flow Fixed!' : 'Chaotic Arrangement'}
        </span>

        {/* Centerpiece Song Sequence Shell */}
        <div className="relative w-full h-full flex items-center justify-center">
          
          {/* Connecting transition flow lines in Sequenced state */}
          <AnimatePresence>
            {flowFixed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-16 pointer-events-none"
              >
                {/* Connecting arrow stickers */}
                <div className="absolute top-[32%] w-6 h-6 rounded-full bg-brand-yellow border-2 border-black flex items-center justify-center z-15 shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5 rotate-90 stroke-[3px]" />
                </div>
                <div className="absolute top-[52%] w-6 h-6 rounded-full bg-brand-yellow border-2 border-black flex items-center justify-center z-15 shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5 rotate-90 stroke-[3px]" />
                </div>
                <div className="absolute top-[72%] w-6 h-6 rounded-full bg-brand-yellow border-2 border-black flex items-center justify-center z-15 shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5 rotate-90 stroke-[3px]" />
                </div>

                {/* Animated Pulsing Sound Wave Background */}
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-44 rounded-3xl bg-brand-pink/5 border-2 border-dashed border-brand-pink/30 flex items-center justify-around px-8 pointer-events-none z-0">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: [20, 60, 10, 80, 20],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.08,
                        ease: 'easeInOut',
                      }}
                      className="w-1.5 bg-brand-pink/20 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Song Block Nodes */}
          {mockSongs.map((song) => {
            const currentPos = flowFixed ? song.sequencedPos : song.chaoticPos;

            return (
              <motion.div
                key={song.id}
                layout
                animate={{
                  x: currentPos.x,
                  y: currentPos.y,
                  rotate: currentPos.rotate,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 120,
                  damping: 14,
                }}
                className={cn(
                  'absolute neo-border p-3 w-[260px] rounded-xl flex items-center gap-3 bg-white text-black shadow-sm z-20',
                  flowFixed && 'hover:scale-105 transition-transform'
                )}
              >
                {/* Album Cover */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={song.coverUrl}
                  alt={song.name}
                  className="w-9 h-9 rounded-lg object-cover neo-border shrink-0"
                />

                {/* Info details */}
                <div className="min-w-0 flex-1">
                  <h5 className="font-extrabold text-xs truncate leading-tight">
                    {song.name}
                  </h5>
                  <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                    {song.artist}
                  </p>
                </div>

                {/* Song stats badge */}
                <div className="text-right shrink-0 font-mono">
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded border border-black"
                    style={{ backgroundColor: song.color, color: song.color === '#FFDD00' ? '#000' : '#FFF' }}
                  >
                    {song.bpm} BPM
                  </span>
                  <div className="text-[8px] font-bold text-slate-400 mt-1">
                    Key: {song.key}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Primary Trigger Switch */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <NeoButton
          onClick={toggleFlow}
          color={flowFixed ? 'blue' : 'yellow'}
          size="lg"
          className="w-64"
        >
          {flowFixed ? (
            <>
              <Check className="w-5 h-5 stroke-[3px]" />
              Flow Fixed! Reset
            </>
          ) : (
            <>
              <Shuffle className="w-5 h-5 stroke-[3px] animate-spin-slow" />
              Fix Playlist Flow
            </>
          )}
        </NeoButton>
        <span className="font-handwritten text-lg text-slate-600 tracking-wide rotate-[-1deg]">
          {flowFixed ? 'Pure listening bliss!' : 'Click to rearrange chaotic tracks!'}
        </span>
      </div>
    </div>
  );
}
