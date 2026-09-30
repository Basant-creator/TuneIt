'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { smoothnessScore } from '@/utils/smoothness';

interface GraphTrack {
  id: string;
  name: string;
  energy: number;
}

interface EnergyGraphProps {
  /** The tracks currently shown, in display order. */
  tracks: GraphTrack[];
  /**
   * Every track across both states. Fixing the axis to this set is what makes
   * the before/after comparison fair — a per-chart axis would stretch both
   * lines to look equally dramatic.
   */
  domainTracks: GraphTrack[];
  activeMode?: 'chaotic' | 'optimized';
  className?: string;
}

const W = 460;
const H = 230;
const PAD_X = 40;
const PAD_TOP = 34;
const PAD_BOTTOM = 34;

/**
 * Plots the energy curve of the tracks listed beside it.
 *
 * This replaced a hard-coded illustration: eight invented points labelled
 * "Crash", "Silence" and "Peak Peak!" drawn next to a four-track list, which
 * implied a curve the data did not have.
 */
export function EnergyGraph({ tracks, domainTracks, activeMode = 'chaotic', className }: EnergyGraphProps) {
  const isChaotic = activeMode === 'chaotic';
  const [hovered, setHovered] = React.useState<number | null>(null);

  const energies = domainTracks.map((t) => t.energy);
  const min = Math.min(...energies);
  const max = Math.max(...energies);
  // A little headroom so the extremes do not sit on the axis.
  const lo = Math.max(0, min - 0.08);
  const hi = Math.min(1, max + 0.08);

  const points = tracks.map((t, i) => {
    const x = tracks.length === 1 ? W / 2 : PAD_X + (i / (tracks.length - 1)) * (W - PAD_X * 2);
    const y = PAD_TOP + (1 - (t.energy - lo) / (hi - lo || 1)) * (H - PAD_TOP - PAD_BOTTOM);
    return { x, y, ...t };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const deltas = points.slice(1).map((p, i) => p.energy - points[i].energy);
  const drops = deltas.filter((d) => d < 0).length;
  const score = smoothnessScore(tracks.map((t) => t.energy));
  const biggestJump = deltas.length ? Math.max(...deltas.map(Math.abs)) : 0;

  const stroke = isChaotic ? '#F35B04' : '#01BEFE';

  return (
    <div className={cn('neo-border neo-shadow p-6 rounded-2xl bg-white flex flex-col w-full h-full relative overflow-hidden gpu-layer', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b-2 border-black pb-3">
        <div>
          <h4 className="text-lg font-black uppercase tracking-tight">Energy curve</h4>
          <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">
            The four tracks on the left, in this order
          </p>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-black uppercase border-2 border-black font-mono tabular-nums',
            isChaotic ? 'bg-brand-orange text-white' : 'bg-brand-blue text-black'
          )}
        >
          Flow {score}
        </span>
      </div>

      <div className="flex-1 w-full min-h-[220px] relative bg-[#FBFDF6] neo-border-sm rounded-xl select-none overflow-hidden">
        {/* Dashed grid, drawn in CSS so it costs no SVG nodes */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-20" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="border-r border-b border-black border-dashed" />
          ))}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full relative z-10 overflow-visible"
          role="img"
          aria-label={`Energy across ${tracks.length} tracks. Flow score ${score}, ${drops} energy drop${drops === 1 ? '' : 's'}.`}
        >
          <line x1={PAD_X - 20} y1={H - PAD_BOTTOM + 14} x2={W - PAD_X + 20} y2={H - PAD_BOTTOM + 14} stroke="#000" strokeWidth="3" strokeLinecap="round" />

          <AnimatePresence mode="wait">
            <motion.path
              key={isChaotic ? 'chaotic' : 'optimized'}
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </AnimatePresence>

          {points.map((p, idx) => {
            const isHover = hovered === idx;
            const delta = idx > 0 ? p.energy - points[idx - 1].energy : null;
            const isDrop = delta !== null && delta < 0;
            return (
              <motion.g
                key={`${activeMode}-${p.id}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 + idx * 0.08, type: 'spring', stiffness: 320, damping: 16 }}
                style={{ transformOrigin: `${p.x}px ${p.y}px`, cursor: 'pointer' }}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(idx)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                aria-label={`${p.name}, energy ${p.energy.toFixed(2)}`}
              >
                {/* Big invisible hit area so the dot is easy to hover. */}
                <circle cx={p.x} cy={p.y} r="18" fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHover ? 10 : 7}
                  fill={isDrop ? '#FF006E' : '#FFDD00'}
                  stroke="#000"
                  strokeWidth="3"
                  style={{ transition: 'r 150ms ease-out' }}
                />
                <text
                  x={p.x}
                  y={p.y - 16}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize="10"
                  fontWeight="900"
                  fill="#000"
                  style={{ paintOrder: 'stroke', stroke: '#FFF', strokeWidth: 4 }}
                >
                  {p.name}
                </text>
                {isHover && (
                  <text
                    x={p.x}
                    y={p.y + 26}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize="9"
                    fontWeight="800"
                    fill={isDrop ? '#FF006E' : '#000'}
                    style={{ paintOrder: 'stroke', stroke: '#FFF', strokeWidth: 4 }}
                  >
                    NRG {p.energy.toFixed(2)}
                    {delta !== null && ` (${delta > 0 ? '+' : ''}${delta.toFixed(2)})`}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>

        <AnimatePresence mode="wait">
          <motion.div
            key={isChaotic ? 'note-chaotic' : 'note-optimized'}
            initial={{ opacity: 0, rotate: isChaotic ? 10 : -10, scale: 0.8 }}
            animate={{ opacity: 1, rotate: isChaotic ? -4 : 3, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              'absolute right-4 bottom-3 neo-border px-3 py-1 rounded font-handwritten text-sm z-20 shadow-sm pointer-events-none',
              isChaotic ? 'bg-brand-pink text-white' : 'bg-brand-yellow text-black'
            )}
          >
            {isChaotic
              ? `${drops} drop${drops === 1 ? '' : 's'}, biggest jump ${biggestJump.toFixed(2)}`
              : drops === 0
                ? 'Climbs the whole way up'
                : `${drops} gentle dip${drops === 1 ? '' : 's'}`}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between text-[10px] font-black uppercase font-mono mt-3 text-slate-500">
        <span>First track</span>
        <span className="hidden sm:inline">Hover a dot for its energy</span>
        <span>Last track</span>
      </div>
    </div>
  );
}
