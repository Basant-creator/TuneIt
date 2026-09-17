'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/utils/cn';
import { decodeHtmlEntities } from '@/utils/decodeHtml';
import type { FlowTrack } from '@/types/flow';

/**
 * Above this many tracks the list switches to windowed rendering and drops the
 * per-row layout animation.
 *
 * Framer Motion's `layout` prop measures every row on each reorder, so a
 * 500-track playlist was mounting 500 animated nodes and thrashing layout. The
 * animation is what makes a short playlist feel good and what makes a long one
 * crawl, so it is kept exactly where it pays for itself.
 */
export const VIRTUALIZE_THRESHOLD = 60;

/** Row height in px, and the gap between rows — used to size the virtual window. */
const ROW_HEIGHT = 68;
const ROW_GAP = 8;

interface TrackListProps {
  tracks: FlowTrack[];
  /** 'chaotic' renders the original order; 'optimized' shows engine annotations. */
  variant: 'chaotic' | 'optimized';
  onPreview: (track: FlowTrack) => void;
  className?: string;
}

interface TrackRowProps {
  track: FlowTrack;
  index: number;
  variant: 'chaotic' | 'optimized';
  onPreview: (track: FlowTrack) => void;
}

/** One row. Shared by both the animated and the virtualized paths. */
const TrackRow = React.memo(function TrackRow({
  track,
  index,
  variant,
  onPreview,
}: TrackRowProps) {
  return (
    <div className="flex h-[68px] items-center gap-3 bg-white border-2 border-black rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow gpu-layer">
      <div
        className={cn(
          'w-8 h-8 rounded-full neo-border border-black flex items-center justify-center font-black shrink-0 text-sm',
          variant === 'chaotic' ? 'bg-brand-orange text-white' : 'bg-brand-yellow text-black'
        )}
      >
        {track.displayIndex ?? index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-black text-sm truncate" title={decodeHtmlEntities(track.title)}>
          {decodeHtmlEntities(track.title)}
        </h4>
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-mono text-[10px] text-slate-500 truncate font-bold">
            {decodeHtmlEntities(track.artist)}
          </p>
          {variant === 'optimized' && track.segment && (
            <span className="font-mono text-[8px] font-black uppercase bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0 tracking-wide">
              {track.segment.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {track.estimatedBpm != null && (
          <div className="gap-2 text-right hidden sm:flex">
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase font-black text-slate-400">BPM</span>
              <span className="font-black text-xs">{Math.round(track.estimatedBpm)}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase font-black text-slate-400">NRG</span>
              <span className="font-black text-xs text-brand-pink">
                {track.intensityScore?.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => onPreview(track)}
          title="Listen to 15s Snippet & AI Review"
          className="bg-brand-pink text-white neo-border-xs px-2 py-1 rounded-lg text-[10px] font-black uppercase font-mono hover:scale-105 transition-transform flex items-center gap-1 cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">15s Snippet</span>
        </button>
      </div>
    </div>
  );
});

/** Windowed list: only the rows near the viewport are mounted. */
function VirtualTrackList({ tracks, variant, onPreview, className }: TrackListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // React Compiler cannot auto-memoize around TanStack Virtual's returned
  // functions, so it skips this component. That is fine here: the virtualizer
  // manages its own subscription and the rows are memoized individually.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT + ROW_GAP,
    overscan: 8,
    getItemKey: (index) => tracks[index].videoId + index,
  });

  return (
    <div
      ref={scrollRef}
      data-lenis-prevent="true"
      data-testid="track-list-virtual"
      className={cn('max-h-[60vh] overflow-y-auto pr-2 overscroll-contain', className)}
    >
      <ul
        className="relative w-full list-none m-0 p-0"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <li
            key={item.key}
            className="absolute top-0 left-0 w-full pr-1"
            style={{ transform: `translateY(${item.start}px)`, height: `${item.size}px` }}
          >
            <TrackRow
              track={tracks[item.index]}
              index={item.index}
              variant={variant}
              onPreview={onPreview}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Animated list: every row mounted, with reorder transitions. */
function AnimatedTrackList({ tracks, variant, onPreview, className }: TrackListProps) {
  return (
    <div
      data-lenis-prevent="true"
      data-testid="track-list-animated"
      className={cn('max-h-[60vh] overflow-y-auto pr-2 overscroll-contain', className)}
    >
      <ul className="space-y-2 flex flex-col relative list-none m-0 p-0">
        <AnimatePresence>
          {tracks.map((track, idx) => (
            <motion.li
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.6 }}
              key={track.videoId + (variant === 'chaotic' ? '_chaotic' : '_opt')}
            >
              <TrackRow track={track} index={idx} variant={variant} onPreview={onPreview} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/**
 * Renders the playlist, choosing windowed or animated rendering by length.
 */
export function TrackList(props: TrackListProps) {
  const shouldVirtualize = props.tracks.length > VIRTUALIZE_THRESHOLD;
  return shouldVirtualize ? <VirtualTrackList {...props} /> : <AnimatedTrackList {...props} />;
}
