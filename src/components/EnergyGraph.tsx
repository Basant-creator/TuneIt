'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface EnergyGraphProps {
  className?: string;
  activeMode?: 'chaotic' | 'optimized';
}

export function EnergyGraph({ className, activeMode = 'chaotic' }: EnergyGraphProps) {
  const isChaotic = activeMode === 'chaotic';

  // Coordinate coordinates for the SVG path
  // Graph width is 500, height is 250
  const chaoticPath = "M 20 180 L 80 40 L 140 210 L 200 90 L 260 220 L 320 60 L 380 180 L 440 30";
  const optimizedPath = "M 20 180 Q 80 150, 140 140 T 260 90 T 380 50 L 440 25";

  // Coordinates for labels / dots
  const chaoticDots = [
    { x: 20, y: 180, val: 'Low' },
    { x: 80, y: 40, val: 'Extreme Spike' },
    { x: 140, y: 210, val: 'Crash' },
    { x: 200, y: 90, val: 'Jerk' },
    { x: 260, y: 220, val: 'Silence' },
    { x: 320, y: 60, val: 'Fatigue' },
    { x: 380, y: 180, val: 'Drop' },
    { x: 440, y: 30, val: 'Peak' },
  ];

  const optimizedDots = [
    { x: 20, y: 180, val: 'Start' },
    { x: 100, y: 155, val: 'Warmup' },
    { x: 200, y: 115, val: 'Steady' },
    { x: 300, y: 70, val: 'Build Up' },
    { x: 440, y: 25, val: 'Peak Peak!' },
  ];

  return (
    <div className={cn('neo-border neo-shadow p-6 rounded-2xl bg-white flex flex-col w-full h-full relative overflow-hidden', className)}>
      
      {/* Graph Header */}
      <div className="flex items-center justify-between mb-4 border-b border-black pb-3">
        <div>
          <h4 className="text-lg font-black uppercase tracking-tight">Energy Flow Curve</h4>
          <p className="text-[10px] font-mono text-slate-500 uppercase">Visualizing Track-to-Track Momentum Progression</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            'px-2 py-0.5 rounded text-[10px] font-black uppercase border border-black',
            isChaotic ? 'bg-brand-orange text-white' : 'bg-brand-blue text-black'
          )}>
            {isChaotic ? 'Chaotic Jumps' : 'Gradual Climb'}
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="flex-1 w-full min-h-[220px] relative mt-2 bg-[#FBFDF6] neo-border rounded-xl p-2 select-none overflow-hidden">
        
        {/* Absolute Background Grid lines */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-20">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="border-r border-b border-black border-dashed" />
          ))}
        </div>

        {/* Dynamic SVG Drawing */}
        <svg viewBox="0 0 460 230" className="w-full h-full z-10 relative overflow-visible">
          {/* Axis */}
          <line x1="15" y1="210" x2="450" y2="210" stroke="#000" strokeWidth="3" strokeLinecap="round" />
          <line x1="15" y1="10" x2="15" y2="210" stroke="#000" strokeWidth="3" strokeLinecap="round" />

          {/* Flow Curve */}
          <AnimatePresence mode="wait">
            <motion.path
              key={isChaotic ? 'chaotic' : 'optimized'}
              d={isChaotic ? chaoticPath : optimizedPath}
              fill="none"
              stroke={isChaotic ? '#F35B04' : '#01BEFE'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </AnimatePresence>

          {/* Dots on Curves */}
          <AnimatePresence>
            {(isChaotic ? chaoticDots : optimizedDots).map((dot, idx) => (
              <motion.g
                key={`${isChaotic ? 'ch' : 'op'}-${idx}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300 }}
              >
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r="6"
                  fill={isChaotic ? '#FF006E' : '#FFDD00'}
                  stroke="#000"
                  strokeWidth="3"
                />
                
                {/* Floating label tags inside SVG */}
                <text
                  x={dot.x}
                  y={dot.y - 12}
                  textAnchor="middle"
                  className="font-mono text-[9px] font-black"
                  fill="#000"
                  style={{ paintOrder: 'stroke', stroke: '#FFF', strokeWidth: 3 }}
                >
                  {dot.val}
                </text>
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>

        {/* Handwritten Annotation Box inside the graph */}
        <AnimatePresence>
          {isChaotic ? (
            <motion.div
              initial={{ opacity: 0, rotate: 10, scale: 0.8 }}
              animate={{ opacity: 1, rotate: -4, scale: 1 }}
              exit={{ opacity: 0, rotate: 0, scale: 0.8 }}
              className="absolute right-4 bottom-8 neo-border px-3 py-1 bg-brand-pink text-white rounded font-handwritten text-sm select-none z-20 shadow-sm"
            >
              {"🎧 \"This sequence gives listeners whiplash!\""}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, rotate: -10, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 3, scale: 1 }}
              exit={{ opacity: 0, rotate: 0, scale: 0.8 }}
              className="absolute right-6 bottom-12 neo-border px-3 py-1 bg-brand-yellow text-black rounded font-handwritten text-sm select-none z-20 shadow-sm"
            >
              {"🔥 \"A perfectly sequenced crescendo!\""}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Y Axis / X Axis Info labels */}
      <div className="flex items-center justify-between text-[10px] font-black uppercase font-mono mt-3 text-slate-500">
        <span>⬅️ Start of Playlist</span>
        <span>End of Playlist ➡️</span>
      </div>
    </div>
  );
}
