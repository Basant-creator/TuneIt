'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Check, Info, Minus, X } from 'lucide-react';
import { PRESET_TRACKS } from '@/data/presetTracks';
import {
  scoreSelection,
  segmentLabel,
  type SandboxMode,
} from '@/utils/sandboxMetrics';
import { TrackImage } from './TrackImage';

interface FlowSandboxProps {
  modeId: string; // 'bu' | 'df' | 'ph' | 'cm'
  selectedTrackIds: string[];
  onChangeSelected: (ids: string[]) => void;
}

const SEQUENCE_TITLE: Record<SandboxMode, string> = {
  bu: 'Rise Curve Sequence',
  df: 'Drift Flow Sequence',
  ph: 'Unhinged Contrast Sequence',
  cm: 'Frame Narrative Sequence',
};

/** Describes one transition from the energy change the engine reported. */
function describeStep(
  dE: number,
  nextSegment: string | null
): { label: string; color: string } {
  const size = Math.abs(dE);
  if (nextSegment === 'CURVEBALL')
    return { label: 'Curveball', color: 'bg-brand-pink' };
  if (size <= 0.1) return { label: 'Gentle blend', color: 'bg-green-500' };
  if (size <= 0.25)
    return {
      label: dE > 0 ? 'Step up' : 'Step down',
      color: 'bg-brand-yellow',
    };
  if (size < 0.35)
    return {
      label: dE > 0 ? 'Big step up' : 'Big step down',
      color: 'bg-brand-orange',
    };
  return { label: 'Jump', color: 'bg-brand-pink' };
}

/**
 * The sandbox on each mode card. It shows what the real engine does with the
 * chosen tracks: the order, each track's role in that order, and anything the
 * engine set aside. All of it comes from sandboxEngineResults.json, which the
 * backend generates by running the actual engines over every selection.
 */
export function FlowSandbox({
  modeId,
  selectedTrackIds,
  onChangeSelected,
}: FlowSandboxProps) {
  const mode = modeId as SandboxMode;

  const categoryTracks = React.useMemo(
    () => PRESET_TRACKS.filter((track) => track.category === mode),
    [mode]
  );

  const toggleTrack = (id: string) => {
    if (selectedTrackIds.includes(id)) {
      onChangeSelected(selectedTrackIds.filter((tId) => tId !== id));
    } else if (selectedTrackIds.length < 5) {
      onChangeSelected([...selectedTrackIds, id]);
    }
  };

  const score = React.useMemo(
    () => scoreSelection(mode, selectedTrackIds),
    [mode, selectedTrackIds]
  );

  return (
    // Explicit text-black: Rise and Unhinged sit in `text-white` sections, and
    // anything here without its own colour inherited white — the title became
    // white on white (1.00:1) and selected track names white on yellow (1.35:1).
    <div className="flex h-full min-h-0 flex-col justify-between gap-3 text-black">
      {/* 1. Track selector */}
      <div className="shrink-0">
        <div className="mb-1.5 flex items-center justify-between select-none">
          <h4 className="text-[11px] font-black tracking-tight uppercase">
            1. Build Your Mix (Select 5)
          </h4>
          <span
            className={cn(
              'neo-border rounded px-1.5 py-0.5 font-mono text-[9px] font-black uppercase select-none',
              selectedTrackIds.length === 5
                ? 'bg-brand-pink animate-none text-white'
                : 'bg-brand-yellow animate-pulse text-black'
            )}
          >
            Selected: {selectedTrackIds.length}/5
          </span>
        </div>

        {/* One swipeable row on phones, where the card has ~300px to share
            with the engine's output; a 5 x 2 grid from sm up. */}
        <div
          data-lenis-prevent="true"
          className="mb-1.5 flex snap-x gap-1 overflow-x-auto overscroll-contain pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0"
        >
          {categoryTracks.map((track) => {
            const isSelected = selectedTrackIds.includes(track.id);
            const isDisabled = !isSelected && selectedTrackIds.length >= 5;

            return (
              <button
                key={track.id}
                type="button"
                onClick={() => toggleTrack(track.id)}
                disabled={isDisabled}
                title={
                  track.awkward
                    ? `${track.name} — tricky: ${track.role.toLowerCase()}`
                    : track.name
                }
                className={cn(
                  'neo-border relative flex w-32 shrink-0 snap-start items-center gap-1 overflow-hidden rounded-lg p-1 text-left transition-all select-none sm:w-full',
                  isSelected
                    ? 'bg-brand-yellow translate-y-[1px] scale-[0.98]'
                    : isDisabled
                      ? 'cursor-not-allowed border-slate-300! bg-slate-50 opacity-40'
                      : 'bg-white hover:translate-y-[-1px] hover:shadow-sm'
                )}
              >
                <TrackImage
                  src={track.coverUrl}
                  alt={track.name}
                  containerClassName="w-6.5 h-6.5 rounded neo-border-xs shrink-0"
                />
                <span className="block min-w-0 flex-1">
                  <span className="block truncate text-[8.5px] leading-tight font-extrabold">
                    {track.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[7.5px] font-bold text-slate-500">
                    {/* Added to give the engine something hard to handle. */}
                    {track.awkward && (
                      <span className="font-black text-orange-700 uppercase">
                        Tricky ·{' '}
                      </span>
                    )}
                    {track.artist}
                  </span>
                </span>
                {isSelected && (
                  <span className="text-brand-yellow neo-border-xs absolute top-0.5 right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-black">
                    <Check className="h-1.5 w-1.5 stroke-[4px]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. What the engine does with them */}
      <div className="flex min-h-[380px] flex-1 flex-col justify-center border-t border-dashed border-slate-300 pt-2 lg:min-h-0">
        <AnimatePresence mode="wait">
          {!score ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-sm py-6 text-center font-mono select-none"
            >
              <Info className="text-brand-pink mx-auto mb-1.5 h-7 w-7" />
              <p className="text-[11px] font-black text-slate-600 uppercase">
                Pick five tracks
              </p>
              <p className="mt-1 text-[9px] leading-normal text-slate-400">
                Choose {5 - selectedTrackIds.length} more to see what the engine
                does with them.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="neo-border neo-shadow relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl bg-[#E8F0FE] p-3">
                <div className="neo-border-b mb-2 flex shrink-0 items-center justify-between pb-1.5 select-none">
                  {/* sky-700 on this panel is ~5:1; the brand cyan was 1.87:1. */}
                  <span className="flex items-center gap-1 font-mono text-[10px] font-black text-sky-700 uppercase">
                    {SEQUENCE_TITLE[mode]}
                  </span>
                  <span
                    className={cn(
                      'neo-border-sm rounded px-1.5 py-0.5 font-mono text-[8.5px] font-black tabular-nums',
                      score.passed === score.applicable
                        ? 'bg-green-300 text-black'
                        : 'bg-brand-orange text-white'
                    )}
                    title="Promises on this mode's card that the engine kept, for these five tracks"
                  >
                    Checks {score.passed}/{score.applicable}
                  </span>
                </div>

                {/* The engine's order */}
                <div
                  data-lenis-prevent="true"
                  className="my-1.5 min-h-0 flex-1 scrollbar-thin space-y-1.5 overflow-y-auto overscroll-contain pr-1"
                >
                  {score.tracks.map((track, idx) => {
                    const step = score.run.order[idx];
                    const next = score.run.order[idx + 1];
                    const label = segmentLabel(step.seg);
                    const transition = next
                      ? describeStep(next.dE, next.seg)
                      : null;
                    // Per-transition version of the smoothness score.
                    const flow = next
                      ? Math.max(0, Math.round(100 - Math.abs(next.dE) * 100))
                      : null;

                    return (
                      <div key={`track-${track.id}`} className="flex flex-col">
                        <motion.div
                          layout
                          transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 25,
                          }}
                          className={cn(
                            'neo-border-sm neo-shadow-sm flex items-center justify-between rounded-lg bg-white p-1.5 text-xs select-none',
                            step.seg === 'CURVEBALL' && 'ring-brand-pink ring-2'
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="neo-border-xs flex h-4 w-4 shrink-0 items-center justify-center rounded bg-black font-mono text-[8px] font-black text-white">
                              {idx + 1}
                            </span>
                            <TrackImage
                              src={track.coverUrl}
                              alt={track.name}
                              containerClassName="w-6.5 h-6.5 rounded neo-border-sm shrink-0"
                            />
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="truncate text-[10px] leading-tight font-black text-black">
                                {track.name}
                              </p>
                              <p className="mt-0.5 truncate text-[8px] leading-none font-bold text-slate-500 tabular-nums">
                                {track.artist} · NRG {track.energy.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2.5">
                            {/* The role the engine gave this track, not a fixed label. */}
                            {label && (
                              <span
                                className={cn(
                                  'neo-border-sm shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[8px] font-black uppercase select-none',
                                  step.seg === 'CURVEBALL'
                                    ? 'bg-brand-pink text-white'
                                    : 'bg-brand-yellow text-black'
                                )}
                              >
                                {label}
                              </span>
                            )}
                            <div className="hidden w-20 shrink-0 flex-col items-end sm:flex sm:w-24">
                              <div className="mb-0.5 flex w-full justify-between font-mono text-[7.5px] leading-none font-bold">
                                <span className="text-slate-500">Next</span>
                                <span className="font-black text-black">
                                  {flow === null ? 'END' : `${flow}%`}
                                </span>
                              </div>
                              <div className="neo-border-sm relative h-1.5 w-full overflow-hidden rounded bg-slate-100">
                                <div
                                  className={cn(
                                    'h-full border-r border-black',
                                    transition?.color ?? 'bg-slate-300'
                                  )}
                                  style={{ width: `${flow ?? 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {transition && next && (
                          <div className="my-0.5 flex items-center pl-8 select-none">
                            <div className="h-2.5 w-0.5 border-l border-dashed border-black bg-black" />
                            <span className="ml-1.5 font-mono text-[7.5px] font-black text-slate-500 uppercase tabular-nums">
                              Transition:{' '}
                              <span className="font-extrabold text-black">
                                {transition.label}
                              </span>{' '}
                              <span className="text-slate-500">
                                ({next.dE > 0 ? '+' : ''}
                                {next.dE.toFixed(2)})
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Tracks the engine set aside, with its reason. */}
                  {score.excludedTracks.length > 0 && (
                    <div className="mt-1 rounded-lg border-2 border-dashed border-slate-400 bg-white/70 p-1.5">
                      <p className="mb-1 font-mono text-[7.5px] font-black text-slate-600 uppercase">
                        Set aside by the engine
                      </p>
                      {score.excludedTracks.map(({ track, reason }) => (
                        <p
                          key={track.id}
                          className="font-mono text-[8px] leading-snug font-bold text-slate-600"
                        >
                          <span className="font-black text-black">
                            {track.name}
                          </span>{' '}
                          <span className="tabular-nums">
                            (NRG {track.energy.toFixed(2)}, {track.bpm} BPM)
                          </span>{' '}
                          — {reason}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checks and bars, each against a random order of the same picks */}
                <div className="neo-border-sm neo-shadow-sm mt-2.5 shrink-0 rounded-lg bg-white p-2 select-none">
                  <p className="mb-1.5 text-[9px] leading-normal font-bold text-slate-800">
                    {score.summary}{' '}
                    <span className="font-black text-sky-700">
                      {score.comparison}
                    </span>
                  </p>

                  <div className="flex flex-col gap-1.5 border-t border-dashed border-slate-300 pt-1.5 sm:grid sm:grid-cols-[1.3fr_1fr] sm:gap-3">
                    <ul className="flex flex-col gap-0.5" aria-label="Checks">
                      {score.checks.map((check) => (
                        <li
                          key={check.id}
                          data-check={check.id}
                          className="flex items-center gap-1.5 font-mono text-[8px] font-bold"
                          title={check.hint}
                        >
                          <span
                            className={cn(
                              'neo-border-xs flex h-3 w-3 shrink-0 items-center justify-center rounded-sm',
                              check.pass === true && 'bg-green-400',
                              check.pass === false &&
                                'bg-brand-pink text-white',
                              check.pass === null &&
                                'bg-slate-200 text-slate-500'
                            )}
                            aria-label={
                              check.pass === true
                                ? 'Passed'
                                : check.pass === false
                                  ? 'Failed'
                                  : 'Does not apply'
                            }
                          >
                            {check.pass === true ? (
                              <Check className="h-2 w-2 stroke-[4px]" />
                            ) : check.pass === false ? (
                              <X className="h-2 w-2 stroke-[4px]" />
                            ) : (
                              <Minus className="h-2 w-2 stroke-[4px]" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-black">
                            {check.name}
                          </span>
                          <span className="shrink-0 text-slate-500 tabular-nums">
                            {check.shuffled === null
                              ? 'shuffled —'
                              : `shuffled ${check.shuffled}%`}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col justify-center gap-1">
                      {score.bars.map((bar) => (
                        <div
                          key={bar.id}
                          data-bar={bar.id}
                          className="flex flex-col gap-0.5"
                          title={bar.hint}
                        >
                          <div className="flex justify-between gap-1 font-mono text-[7.5px] font-black text-slate-600 uppercase">
                            <span className="truncate">{bar.name}</span>
                            <span className="shrink-0 tabular-nums" data-value>
                              {bar.value === null ? (
                                <span
                                  className="text-slate-400"
                                  aria-label="Nothing to measure"
                                >
                                  —
                                </span>
                              ) : (
                                <span className="text-black">{bar.value}%</span>
                              )}
                              {bar.shuffled !== null && (
                                <span className="text-slate-400 normal-case">
                                  {' '}
                                  · shuffled {bar.shuffled}%
                                </span>
                              )}
                            </span>
                          </div>
                          {bar.value === null ? (
                            // Hatched, not empty: "nothing to measure" must not look
                            // like a measured zero.
                            <div
                              className="neo-border-xs h-1.5 w-full overflow-hidden rounded opacity-60"
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(135deg, #cbd5e1 0 3px, transparent 3px 6px)',
                              }}
                            />
                          ) : (
                            <div className="neo-border-xs relative h-1.5 w-full overflow-hidden rounded bg-slate-100">
                              <div
                                className="bg-brand-pink h-full border-r border-black"
                                style={{ width: `${bar.value}%` }}
                              />
                              {/* Where a random order of the same picks lands. */}
                              {bar.shuffled !== null && (
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-black"
                                  style={{
                                    left: `calc(${bar.shuffled}% - 1px)`,
                                  }}
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
