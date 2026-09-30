'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Check, Info } from 'lucide-react';
import { Track, PRESET_TRACKS } from '@/data/presetTracks';
import { getTransitionPenalty, getTransitionScore, getEffectiveBpm } from '@/utils/flowScoring';
import { TrackImage } from './TrackImage';

interface FlowSandboxProps {
  modeId: string; // 'bu' | 'df' | 'ph' | 'cm'
  selectedTrackIds: string[];
  onChangeSelected: (ids: string[]) => void;
}

/**
 * Pure backtracking optimization function to determine optimal 5-track arrangement.
 */
function optimizeTrackOrder(tracks: Track[], modeId: string): Track[] {
  if (tracks.length !== 5) return tracks;

  let bestPerm: Track[] = [...tracks];
  let bestPenalty = Infinity;

  const currentPerm: Track[] = [];
  const used = new Array(5).fill(false);

  const backtrack = (idx: number, currentPenalty: number) => {
    if (currentPenalty >= bestPenalty) return;

    if (idx === 5) {
      bestPenalty = currentPenalty;
      bestPerm = [...currentPerm];
      return;
    }

    for (let i = 0; i < 5; i++) {
      if (used[i]) continue;

      let nextPenalty = 0;
      if (idx > 0) {
        nextPenalty = getTransitionPenalty(currentPerm[idx - 1], tracks[i], modeId, idx);
      }

      used[i] = true;
      currentPerm.push(tracks[i]);

      backtrack(idx + 1, currentPenalty + nextPenalty);

      currentPerm.pop();
      used[i] = false;
    }
  };

  backtrack(0, 0);
  return bestPerm;
}

export function FlowSandbox({ modeId, selectedTrackIds, onChangeSelected }: FlowSandboxProps) {
  // Filter active preset tracks based on the current mode
  const categoryTracks = React.useMemo(() => {
    return PRESET_TRACKS.filter((track) => track.category === modeId);
  }, [modeId]);

  const toggleTrack = (id: string) => {
    if (selectedTrackIds.includes(id)) {
      onChangeSelected(selectedTrackIds.filter((tId) => tId !== id));
    } else if (selectedTrackIds.length < 5) {
      onChangeSelected([...selectedTrackIds, id]);
    }
  };

  const selectedTracksInOrder = React.useMemo(() => {
    return selectedTrackIds
      .map((id) => PRESET_TRACKS.find((t) => t.id === id))
      .filter((t): t is Track => !!t);
  }, [selectedTrackIds]);

  // Backtracking global sequencing optimizer
  const optimizedTracks = React.useMemo(() => {
    return optimizeTrackOrder(selectedTracksInOrder, modeId);
  }, [selectedTracksInOrder, modeId]);

  // Measured metrics, a data-driven summary, and a one-line verdict
  const stats = React.useMemo(() => {
    if (selectedTracksInOrder.length !== 5 || optimizedTracks.length !== 5) return null;

    let totalScore = 0;
    for (let i = 0; i < optimizedTracks.length - 1; i++) {
      totalScore += getTransitionScore(optimizedTracks[i], optimizedTracks[i + 1], modeId, i);
    }

    const flowScore = Math.max(30, Math.min(100, Math.round(totalScore / 4)));

    // Every figure below is measured from the five tracks actually chosen.
    // This block used to show invented "metrics": Atmosphere and Variety were
    // the constants 88 and 95, and Immersion, Replay Value and Flow State were
    // the same flow score relabelled with different fudge factors.
    const e = optimizedTracks.map((t) => t.energy);
    const bpm = optimizedTracks.map((t) => getEffectiveBpm(t.bpm));
    const steps = e.slice(1).map((v, i) => v - e[i]);
    const bpmSteps = bpm.slice(1).map((v, i) => Math.abs(v - bpm[i]));
    const transitions = steps.length;
    const pct = (n: number) => Math.round((n / transitions) * 100);
    const range = Math.max(...e) - Math.min(...e);

    const smoothness = Math.max(0, Math.round(100 - (steps.reduce((a, d) => a + Math.abs(d), 0) / transitions) * 100));
    // ~6 BPM is roughly where a beat-matched transition stops sounding matched.
    const tempoMatchCount = bpmSteps.filter((d) => d <= 6).length;

    let metrics: { name: string; value: number }[] = [];
    let concludingSentence = '';
    let feedbackMessage = '';

    const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2);

    if (modeId === 'bu') {
      const rising = steps.filter((d) => d > 0).length;
      // Share of the available climb actually achieved, first track to last.
      const climb = range === 0 ? 0 : Math.max(0, Math.min(100, Math.round(((e[e.length - 1] - e[0]) / range) * 100)));
      metrics = [
        { name: 'Smoothness', value: smoothness },
        { name: 'Rising steps', value: pct(rising) },
        { name: 'Climb achieved', value: climb },
        { name: 'Tempo matched', value: pct(tempoMatchCount) },
      ];
      feedbackMessage = `${rising} of ${transitions} transitions step up, and it finishes ${fmt(e[e.length - 1] - e[0])} above where it started.`;
      concludingSentence = rising === transitions ? 'A clean climb, no step backwards.' : 'A climb with a breather or two, which is the point.';
    } else if (modeId === 'df') {
      const gentle = steps.filter((d) => Math.abs(d) <= 0.15).length;
      const steadiness = Math.max(0, Math.round(100 - range * 100));
      metrics = [
        { name: 'Smoothness', value: smoothness },
        { name: 'Gentle transitions', value: pct(gentle) },
        { name: 'Energy steadiness', value: steadiness },
        { name: 'Tempo matched', value: pct(tempoMatchCount) },
      ];
      feedbackMessage = `${gentle} of ${transitions} transitions move energy by 0.15 or less, and the whole mix spans ${range.toFixed(2)}.`;
      concludingSentence = range <= 0.25 ? 'Level enough to disappear into.' : 'Some movement in here — a wider mix than Drift usually likes.';
    } else if (modeId === 'cm') {
      const peakIdx = e.indexOf(Math.max(...e));
      // 100 when the peak sits in the middle of five, falling to 0 at either end.
      const peakCentred = Math.max(0, Math.round(100 - (Math.abs(peakIdx - 2) / 2) * 100));
      const resolves = range === 0 ? 0 : Math.max(0, Math.min(100, Math.round(((e[peakIdx] - e[e.length - 1]) / range) * 100)));
      metrics = [
        { name: 'Smoothness', value: smoothness },
        { name: 'Peak in the middle', value: peakCentred },
        { name: 'Comes back down', value: resolves },
        { name: 'Tempo matched', value: pct(tempoMatchCount) },
      ];
      feedbackMessage = `The peak lands on track ${peakIdx + 1} of ${e.length}, then energy settles ${fmt(e[e.length - 1] - e[peakIdx])} by the end.`;
      concludingSentence = peakIdx > 0 && peakIdx < e.length - 1 ? 'A real middle act, with somewhere to land.' : 'The peak is at an edge, so the arc feels lopsided.';
    } else {
      // 'ph' -> Unhinged
      // The real engine only accepts a curveball at ΔE >= 0.45, relaxing to
      // 0.35 at most (backend/src/utils/unhingedAlgorithm.ts). Use its loosest
      // bar rather than an easier one, so the demo cannot overstate the mode.
      const CURVEBALL_MIN = 0.35;
      const swings = steps.map((d, i) => ({ big: Math.abs(d) >= CURVEBALL_MIN, anchored: bpmSteps[i] <= 6 }));
      const bigCount = swings.filter((x) => x.big).length;
      const anchoredCount = swings.filter((x) => x.big && x.anchored).length;
      const biggest = Math.max(...steps.map(Math.abs));
      metrics = [
        { name: 'Big swings', value: pct(bigCount) },
        { name: 'Swings anchored', value: bigCount === 0 ? 0 : Math.round((anchoredCount / bigCount) * 100) },
        { name: 'Biggest swing', value: Math.round(biggest * 100) },
        { name: 'Tempo matched', value: pct(tempoMatchCount) },
      ];
      if (range < CURVEBALL_MIN) {
        // Say *why*: no ordering of these tracks can swing, because the set
        // itself has no range. That is the track choice, not the sequencing.
        feedbackMessage = `These five sit within ${range.toFixed(2)} of each other, so there is nothing to swing between — a curveball needs a jump of ${CURVEBALL_MIN} or more.`;
        concludingSentence = 'Unhinged needs a calm track and a loud one to throw between.';
      } else {
        feedbackMessage = `${bigCount} of ${transitions} transitions swing energy by ${CURVEBALL_MIN} or more; ${anchoredCount} of those keep the tempo close.`;
        concludingSentence = bigCount === 0 ? 'The range is there, but this order never uses it.' : anchoredCount === bigCount ? 'Every curveball has a tempo to land on.' : 'Some swings have nothing to hold on to.';
      }
    }

    return { flowScore, metrics, feedbackMessage, concludingSentence };
  }, [selectedTracksInOrder, optimizedTracks, modeId]);

  return (
    <div className="flex flex-col h-full justify-between gap-3 min-h-0">
      {/* 1. Track Selector Header */}
      <div className="shrink-0">
        <div className="flex justify-between items-center mb-1.5 select-none">
          <h4 className="text-[11px] font-black uppercase tracking-tight">1. Build Your Mix (Select 5)</h4>
          <span
            className={cn(
              'neo-border px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono select-none',
              selectedTrackIds.length === 5
                ? 'bg-brand-pink text-white animate-none'
                : 'bg-brand-yellow text-black animate-pulse'
            )}
          >
            Selected: {selectedTrackIds.length}/5
          </span>
        </div>

        {/* Tracks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mb-1.5">
          {categoryTracks.map((track) => {
            const isSelected = selectedTrackIds.includes(track.id);
            const isDisabled = !isSelected && selectedTrackIds.length >= 5;

            return (
              <button
                key={track.id}
                onClick={() => toggleTrack(track.id)}
                disabled={isDisabled}
                className={cn(
                  'neo-border p-1 rounded-lg text-left flex gap-1 items-center transition-all relative overflow-hidden select-none w-full',
                  isSelected
                    ? 'bg-brand-yellow scale-[0.98] translate-y-[1px]'
                    : isDisabled
                    ? 'bg-slate-50 border-slate-300! opacity-40 cursor-not-allowed'
                    : 'bg-white hover:translate-y-[-1px] hover:shadow-sm'
                )}
              >
                {/* Image */}
                <TrackImage
                  src={track.coverUrl}
                  alt={track.name}
                  containerClassName="w-6.5 h-6.5 rounded neo-border-xs shrink-0"
                />

                <span className="min-w-0 flex-1 block">
                  <span className="font-extrabold text-[8.5px] truncate leading-tight block">{track.name}</span>
                  <span className="flex justify-between items-center mt-0.5">
                    <span className="text-[7.5px] font-mono font-bold text-slate-500 truncate block">{track.artist}</span>
                  </span>
                </span>

                {isSelected && (
                  <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-black text-brand-yellow rounded-full flex items-center justify-center neo-border-xs">
                    <Check className="w-1.5 h-1.5 stroke-[4px]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Mixer / Output Display */}
      <div className="flex-1 border-t border-dashed border-slate-300 pt-2 flex flex-col justify-center min-h-0">
        <AnimatePresence mode="wait">
          {selectedTrackIds.length < 5 ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-6 font-mono max-w-sm mx-auto select-none"
            >
              <Info className="w-7 h-7 text-brand-pink mx-auto mb-1.5" />
              <p className="text-[11px] font-black text-slate-600 uppercase">Awaiting Playlist Construction</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                Click {5 - selectedTrackIds.length} more track{5 - selectedTrackIds.length > 1 ? 's' : ''} to build the mix.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex flex-col bg-[#E8F0FE] neo-border rounded-2xl p-3 relative overflow-hidden neo-shadow h-full min-h-0 justify-between">
                {/* Header */}
                <div className="neo-border-b pb-1.5 mb-2 flex justify-between items-center select-none shrink-0">
                  <span className="text-[10px] font-black uppercase text-brand-blue flex items-center gap-1 font-mono">
                    {modeId === 'bu' && 'Rise Curve Sequence'}
                    {modeId === 'df' && 'Drift Flow Sequence'}
                    {modeId === 'ph' && 'Unhinged Contrast Sequence'}
                    {modeId === 'cm' && 'Frame Narrative Sequence'}
                  </span>
                  {stats && (
                    <span className="bg-brand-blue text-black neo-border-sm rounded px-1.5 py-0.5 text-[8.5px] font-black font-mono">
                      Match {stats.flowScore}%
                    </span>
                  )}
                </div>

                {/* Playlist Scroll Area */}
                <div data-lenis-prevent="true" className="space-y-1.5 flex-1 overflow-y-auto pr-1 scrollbar-thin my-1.5 min-h-0 overscroll-contain">
                  {optimizedTracks.map((track, idx) => {
                    const nextTrack = optimizedTracks[idx + 1];
                    const hasNext = !!nextTrack;
                    const transScore = hasNext ? getTransitionScore(track, nextTrack, modeId, idx) : 100;

                    let scoreColor = 'bg-green-500';
                    let textStatus = 'Clean blend';
                    if (transScore < 75) {
                      scoreColor = 'bg-brand-orange';
                      textStatus = 'Tension Bridge';
                    } else if (transScore < 90) {
                      scoreColor = 'bg-brand-yellow';
                      textStatus = 'Smooth Pivot';
                    }

                    return (
                      <div key={`track-${track.id}`} className="flex flex-col">
                        {/* Track Card */}
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className="bg-white neo-border-sm p-1.5 rounded-lg flex items-center justify-between text-xs neo-shadow-sm select-none"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-4 h-4 rounded bg-black text-white neo-border-xs flex items-center justify-center font-black font-mono text-[8px] shrink-0">
                              {idx + 1}
                            </span>
                            {/* Track Image */}
                            <TrackImage
                              src={track.coverUrl}
                              alt={track.name}
                              containerClassName="w-6.5 h-6.5 rounded neo-border-sm shrink-0"
                            />
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-black truncate text-[10px] leading-tight text-black">{track.name}</p>
                              <p className="font-bold text-[8px] text-slate-500 truncate leading-none mt-0.5">{track.artist}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono font-black text-[8px] uppercase bg-brand-yellow neo-border-sm px-1.5 py-0.5 rounded-md select-none shrink-0 text-black">
                              {track.role}
                            </span>

                            <div className="flex flex-col items-end w-20 sm:w-24 shrink-0">
                              <div className="flex justify-between w-full text-[7.5px] font-mono font-bold leading-none mb-0.5">
                                <span className="text-slate-400">Flow</span>
                                <span className="font-black text-black">
                                  {hasNext ? `${transScore}%` : 'END'}
                                </span>
                              </div>
                              <div className="w-full h-1.5 neo-border-sm rounded bg-slate-100 overflow-hidden relative">
                                <div
                                  className={cn('h-full border-r border-black', scoreColor)}
                                  style={{ width: `${hasNext ? transScore : 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Transition details */}
                        {hasNext && (
                          <div className="flex items-center pl-8 my-0.5 select-none">
                            <div className="w-0.5 h-2.5 bg-black border-dashed border-l border-black" />
                            <span className="text-[7.5px] font-mono font-black uppercase text-slate-400 ml-1.5">
                              Transition: <span className="text-black font-extrabold">{textStatus}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Score Summary & Feedback */}
                {stats && (
                  <div className="mt-2.5 neo-border-sm bg-white rounded-lg p-2 neo-shadow-sm select-none shrink-0">
                    <p className="text-[9px] font-bold leading-normal text-slate-800 mb-2">
                      {stats.feedbackMessage} <span className="font-black text-brand-pink">{stats.concludingSentence}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-2 border-t border-dashed border-slate-300 pt-2">
                      {stats.metrics.map((metric) => (
                        <div key={metric.name} className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[7.5px] font-mono font-black uppercase text-slate-600">
                            <span>{metric.name}</span>
                            <span className="text-black">{metric.value}%</span>
                          </div>
                          <div className="w-full h-1.5 neo-border-xs rounded bg-slate-100 overflow-hidden relative">
                            <div
                              className="h-full bg-brand-pink border-r border-black"
                              style={{ width: `${metric.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
