'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';

const TILES = [
  { char: '4', color: 'bg-brand-pink text-white', tilt: -8 },
  { char: '0', color: 'bg-brand-yellow text-black', tilt: 5 },
  { char: '4', color: 'bg-brand-blue text-black', tilt: -3 },
];

/**
 * 404, on theme: the page is missing, so the digits are loose tiles you can
 * drag around or shuffle. TuneIt's whole job is reordering things.
 */
export default function NotFound() {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [order, setOrder] = React.useState([0, 1, 2]);
  // Bumping the key re-mounts the tiles, snapping any dragged ones back home.
  const [shuffleKey, setShuffleKey] = React.useState(0);

  const shuffle = () => {
    setOrder((prev) => {
      // Always produce a different order than the current one.
      let next = prev;
      while (next.join() === prev.join()) {
        next = [...prev].sort(() => Math.random() - 0.5);
      }
      return next;
    });
    setShuffleKey((k) => k + 1);
  };

  return (
    <main
      id="main"
      className="min-h-[100dvh] bg-[#F8FFE5] text-black flex flex-col items-center justify-center px-6 py-16 overflow-hidden"
    >
      <Sticker color="orange" rotation={-4} size="md" className="mb-8">
        Track skipped
      </Sticker>

      <div
        ref={stageRef}
        className="relative flex items-center justify-center gap-3 sm:gap-6 mb-10 p-6"
        aria-label="404"
        role="img"
      >
        {order.map((tileIndex, position) => {
          const tile = TILES[tileIndex];
          return (
            <motion.div
              key={`${shuffleKey}-${tileIndex}`}
              layout
              drag
              dragConstraints={stageRef}
              dragElastic={0.35}
              dragSnapToOrigin
              whileDrag={{ scale: 1.12, rotate: 0, zIndex: 20, cursor: 'grabbing' }}
              whileHover={{ y: -6, rotate: tile.tilt / 2 }}
              initial={{ y: -120, opacity: 0, rotate: tile.tilt * 3 }}
              animate={{ y: 0, opacity: 1, rotate: tile.tilt }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: position * 0.07 }}
              className={`${tile.color} neo-border rounded-2xl w-24 h-32 sm:w-36 sm:h-48 flex items-center justify-center text-7xl sm:text-9xl font-black neo-shadow-lg cursor-grab touch-none select-none`}
              aria-hidden="true"
            >
              {tile.char}
            </motion.div>
          );
        })}
      </div>

      <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-center mb-3">
        That page isn&apos;t in the playlist.
      </h1>
      <p className="font-mono font-bold text-sm text-slate-700 text-center max-w-[48ch] mb-8">
        The link may be old, or the address has a typo. While you&apos;re here, drag the tiles
        around — reordering things is kind of our whole deal.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <NeoButton href="/" color="yellow" size="lg">
          Back to home
        </NeoButton>
        <NeoButton color="white" size="lg" onClick={shuffle}>
          <Shuffle className="w-5 h-5" aria-hidden="true" />
          Shuffle the 404
        </NeoButton>
      </div>
    </main>
  );
}
