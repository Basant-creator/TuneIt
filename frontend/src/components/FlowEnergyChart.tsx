'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { decodeHtmlEntities } from '@/utils/decodeHtml';
import type { FlowTrack } from '@/types/flow';

interface FlowEnergyChartProps {
  /** The sequence produced by an engine. */
  optimized: FlowTrack[];
  /** The playlist in its original order, drawn as a ghost line for comparison. */
  original?: FlowTrack[];
  engineLabel?: string;
  className?: string;
}

const VIEW_W = 640;
const VIEW_H = 240;
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 28;

const PLOT_W = VIEW_W - PAD_L - PAD_R;
const PLOT_H = VIEW_H - PAD_T - PAD_B;

/** Colour per engine segment label, so Rise/Frame/Unhinged annotations read at a glance. */
const SEGMENT_COLORS: Record<string, string> = {
  ENTRY: '#01BEFE',
  ACT_I: '#01BEFE',
  ACT_II: '#FFDD00',
  ACT_III: '#F35B04',
  PEAK: '#FF006E',
  SETUP: '#01BEFE',
  CURVEBALL: '#FF006E',
  RECOVERY: '#FFDD00',
};

function energyOf(track: FlowTrack): number {
  const raw = track.intensityScore;
  return Math.max(0, Math.min(1, typeof raw === 'number' && Number.isFinite(raw) ? raw : 0.5));
}

function toPoints(tracks: FlowTrack[]): Array<{ x: number; y: number; e: number }> {
  const n = tracks.length;
  return tracks.map((t, i) => {
    const e = energyOf(t);
    const x = n === 1 ? PAD_L + PLOT_W / 2 : PAD_L + (i / (n - 1)) * PLOT_W;
    const y = PAD_T + (1 - e) * PLOT_H;
    return { x, y, e };
  });
}

function toPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

/**
 * Plots the actual energy curve of a sequenced playlist, with the original
 * order behind it for comparison. Hovering a point reveals the track.
 */
export function FlowEnergyChart({
  optimized,
  original,
  engineLabel,
  className,
}: FlowEnergyChartProps) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  const optimizedPoints = React.useMemo(() => toPoints(optimized), [optimized]);
  const originalPoints = React.useMemo(
    () => (original && original.length > 1 ? toPoints(original) : []),
    [original]
  );

  // Plot every point on short playlists; thin out the markers on long ones so
  // the line stays readable.
  const markerStride = Math.max(1, Math.ceil(optimizedPoints.length / 40));

  if (optimized.length === 0) return null;

  const hoveredTrack = hovered !== null ? optimized[hovered] : null;
  const hoveredPoint = hovered !== null ? optimizedPoints[hovered] : null;

  return (
    <div
      className={cn(
        'bg-white neo-border border-black rounded-3xl p-5 sm:p-6 w-full relative overflow-hidden',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b-2 border-black pb-3">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Energy Flow Curve</h3>
          <p className="font-mono text-[10px] font-bold text-slate-500 uppercase">
            Real track-by-track intensity of your {engineLabel ?? 'optimized'} sequence
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] font-black uppercase">
          {originalPoints.length > 0 && (
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-4 h-0.5 bg-slate-400 inline-block rounded-full" />
              Original
            </span>
          )}
          <span className="flex items-center gap-1.5 text-black">
            <span className="w-4 h-1 bg-brand-pink inline-block rounded-full" />
            Optimized
          </span>
        </div>
      </div>

      <div className="relative w-full bg-[#FBFDF6] neo-border-sm border-black rounded-xl overflow-hidden">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label={`Energy curve across ${optimized.length} tracks`}
        >
          {/* Horizontal guides at 0.25 / 0.50 / 0.75 energy */}
          {[0.25, 0.5, 0.75].map((level) => {
            const y = PAD_T + (1 - level) * PLOT_H;
            return (
              <g key={level}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={VIEW_W - PAD_R}
                  y2={y}
                  stroke="#000"
                  strokeWidth="1"
                  strokeDasharray="4 5"
                  opacity="0.18"
                />
                <text x={6} y={y + 3} className="font-mono" fontSize="9" fontWeight="700" fill="#94a3b8">
                  {level.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={VIEW_W - PAD_R} y2={PAD_T + PLOT_H} stroke="#000" strokeWidth="2.5" strokeLinecap="round" />

          {/* Original order, as a ghost reference */}
          {originalPoints.length > 0 && (
            <path
              d={toPath(originalPoints)}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Optimized sequence */}
          <motion.path
            d={toPath(optimizedPoints)}
            fill="none"
            stroke="#FF006E"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {/* Track markers, coloured by engine segment when available */}
          {optimizedPoints.map((p, i) => {
            const isMarker = i % markerStride === 0 || i === optimizedPoints.length - 1;
            if (!isMarker && hovered !== i) return null;
            const segment = optimized[i].segment;
            const fill = (segment && SEGMENT_COLORS[segment]) || '#FFDD00';
            return (
              <circle
                key={optimized[i].videoId + i}
                cx={p.x}
                cy={p.y}
                r={hovered === i ? 7 : 4.5}
                fill={fill}
                stroke="#000"
                strokeWidth="2"
                className="transition-all cursor-pointer"
              />
            );
          })}

          {/* Wide invisible hit areas so hovering is forgiving */}
          {optimizedPoints.map((p, i) => (
            <rect
              key={`hit-${i}`}
              x={p.x - Math.max(6, PLOT_W / Math.max(optimizedPoints.length, 1) / 2)}
              y={PAD_T}
              width={Math.max(12, PLOT_W / Math.max(optimizedPoints.length, 1))}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((cur) => (cur === i ? null : cur))}
            />
          ))}

          {/* Hover guide line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={PAD_T}
              x2={hoveredPoint.x}
              y2={PAD_T + PLOT_H}
              stroke="#000"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.4"
            />
          )}

          <text x={PAD_L} y={VIEW_H - 8} fontSize="9" fontWeight="800" fill="#94a3b8" className="font-mono">
            TRACK 1
          </text>
          <text x={VIEW_W - PAD_R} y={VIEW_H - 8} fontSize="9" fontWeight="800" fill="#94a3b8" textAnchor="end" className="font-mono">
            TRACK {optimized.length}
          </text>
        </svg>

        {/* Hover readout, rendered as HTML so it inherits the app's typography */}
        {hoveredTrack && hoveredPoint && (
          <div
            className="absolute pointer-events-none bg-black text-white rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold max-w-[220px] z-20 shadow-lg"
            style={{
              left: `${(hoveredPoint.x / VIEW_W) * 100}%`,
              top: `${(hoveredPoint.y / VIEW_H) * 100}%`,
              transform: `translate(${hoveredPoint.x > VIEW_W * 0.6 ? '-105%' : '8px'}, -120%)`,
            }}
          >
            <div className="font-black truncate">
              {hovered !== null ? hovered + 1 : ''}. {decodeHtmlEntities(hoveredTrack.title)}
            </div>
            <div className="text-slate-300 truncate">{decodeHtmlEntities(hoveredTrack.artist)}</div>
            <div className="text-brand-yellow mt-0.5">
              NRG {energyOf(hoveredTrack).toFixed(2)}
              {hoveredTrack.estimatedBpm ? ` · ${Math.round(hoveredTrack.estimatedBpm)} BPM` : ''}
              {hoveredTrack.segment ? ` · ${hoveredTrack.segment.replace(/_/g, ' ')}` : ''}
            </div>
          </div>
        )}
      </div>

      <p className="font-mono text-[10px] font-bold text-slate-400 mt-3 text-center uppercase">
        Hover any point to inspect the track at that position
      </p>
    </div>
  );
}
