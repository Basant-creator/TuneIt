'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical, Volume2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  /** Supplying this enables manual reordering. */
  onReorder?: (tracks: FlowTrack[]) => void;
  className?: string;
}

interface TrackRowProps {
  track: FlowTrack;
  index: number;
  variant: 'chaotic' | 'optimized';
  onPreview: (track: FlowTrack) => void;
  /** Drag handle props from dnd-kit; absent when reordering is off. */
  dragHandle?: React.HTMLAttributes<HTMLButtonElement>;
  /** Keyboard/touch alternative to dragging. */
  onMove?: (direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
}

/** One row. Shared by every rendering path. */
const TrackRow = React.memo(function TrackRow({
  track,
  index,
  variant,
  onPreview,
  dragHandle,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
  isDragging = false,
}: TrackRowProps) {
  const reorderable = !!dragHandle || !!onMove;

  return (
    <div
      className={cn(
        'flex h-[68px] items-center gap-2 sm:gap-3 bg-white border-2 border-black rounded-xl p-3 shadow-sm transition-shadow gpu-layer',
        isDragging ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] opacity-90' : 'hover:shadow-md'
      )}
    >
      {reorderable && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            {...dragHandle}
            aria-label={`Reorder ${decodeHtmlEntities(track.title)}`}
            className="touch-none cursor-grab active:cursor-grabbing text-slate-400 hover:text-black p-0.5 rounded"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Buttons matter here: dragging is unusable by keyboard or on a
              phone inside a scrolling list. */}
          <div className="hidden sm:flex flex-col">
            <button
              type="button"
              onClick={() => onMove?.(-1)}
              disabled={!canMoveUp}
              aria-label={`Move ${decodeHtmlEntities(track.title)} up`}
              className="text-slate-400 hover:text-black disabled:opacity-25 disabled:hover:text-slate-400 leading-none cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove?.(1)}
              disabled={!canMoveDown}
              aria-label={`Move ${decodeHtmlEntities(track.title)} down`}
              className="text-slate-400 hover:text-black disabled:opacity-25 disabled:hover:text-slate-400 leading-none cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
          <div className="gap-2 text-right hidden md:flex">
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

/** A row wired into dnd-kit's sortable context. */
function SortableTrackRow({
  track,
  index,
  variant,
  onPreview,
  onMove,
  canMoveUp,
  canMoveDown,
  style,
}: Omit<TrackRowProps, 'dragHandle' | 'isDragging'> & { style?: React.CSSProperties }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.videoId,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        ...style,
        transform: CSS.Transform.toString(transform),
        transition,
        // Keep the dragged row above its neighbours.
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <TrackRow
        track={track}
        index={index}
        variant={variant}
        onPreview={onPreview}
        dragHandle={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
        onMove={onMove}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />
    </li>
  );
}

/** Windowed list: only the rows near the viewport are mounted. */
function VirtualTrackList({
  tracks,
  variant,
  onPreview,
  onReorder,
  className,
  moveBy,
}: TrackListProps & { moveBy?: (index: number, direction: -1 | 1) => void }) {
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
    getItemKey: (index) => tracks[index].videoId,
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
        {virtualizer.getVirtualItems().map((item) => {
          const track = tracks[item.index];
          const style: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            paddingRight: 4,
            transform: `translateY(${item.start}px)`,
            height: `${item.size}px`,
          };

          return onReorder ? (
            <SortableTrackRow
              key={item.key}
              track={track}
              index={item.index}
              variant={variant}
              onPreview={onPreview}
              onMove={(dir) => moveBy?.(item.index, dir)}
              canMoveUp={item.index > 0}
              canMoveDown={item.index < tracks.length - 1}
              style={style}
            />
          ) : (
            <li key={item.key} style={style}>
              <TrackRow track={track} index={item.index} variant={variant} onPreview={onPreview} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Animated list: every row mounted, with reorder transitions. */
function AnimatedTrackList({
  tracks,
  variant,
  onPreview,
  onReorder,
  className,
  moveBy,
}: TrackListProps & { moveBy?: (index: number, direction: -1 | 1) => void }) {
  return (
    <div
      data-lenis-prevent="true"
      data-testid="track-list-animated"
      className={cn('max-h-[60vh] overflow-y-auto pr-2 overscroll-contain', className)}
    >
      <ul className="space-y-2 flex flex-col relative list-none m-0 p-0">
        {onReorder ? (
          tracks.map((track, idx) => (
            <SortableTrackRow
              key={track.videoId}
              track={track}
              index={idx}
              variant={variant}
              onPreview={onPreview}
              onMove={(dir) => moveBy?.(idx, dir)}
              canMoveUp={idx > 0}
              canMoveDown={idx < tracks.length - 1}
            />
          ))
        ) : (
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
        )}
      </ul>
    </div>
  );
}

/**
 * Renders the playlist, choosing windowed or animated rendering by length and
 * wrapping both in a drag-and-drop context when `onReorder` is supplied.
 */
export function TrackList(props: TrackListProps) {
  const { tracks, onReorder } = props;
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    // A small distance threshold keeps a tap on the preview button from
    // being swallowed as the start of a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const moveBy = React.useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (!onReorder || target < 0 || target >= tracks.length) return;
      onReorder(arrayMove(tracks, index, target));
    },
    [onReorder, tracks]
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!onReorder || !over || active.id === over.id) return;

    const from = tracks.findIndex((t) => t.videoId === active.id);
    const to = tracks.findIndex((t) => t.videoId === over.id);
    if (from < 0 || to < 0) return;

    onReorder(arrayMove(tracks, from, to));
  };

  const shouldVirtualize = tracks.length > VIRTUALIZE_THRESHOLD;
  const inner = shouldVirtualize ? (
    <VirtualTrackList {...props} moveBy={moveBy} />
  ) : (
    <AnimatedTrackList {...props} moveBy={moveBy} />
  );

  if (!onReorder) return inner;

  const activeTrack = activeId ? tracks.find((t) => t.videoId === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* Every id is registered, including rows the virtualizer has not
          mounted, so indices stay correct while dragging a long list. */}
      <SortableContext items={tracks.map((t) => t.videoId)} strategy={verticalListSortingStrategy}>
        {inner}
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeTrack ? (
          <div className="pointer-events-none opacity-95">
            <TrackRow
              track={activeTrack}
              index={tracks.findIndex((t) => t.videoId === activeTrack.videoId)}
              variant={props.variant}
              onPreview={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
