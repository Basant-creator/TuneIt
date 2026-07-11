'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Sparkles, Check, Info } from 'lucide-react';
import { Track, PRESET_TRACKS } from '@/data/presetTracks';
import { getTransitionPenalty, getTransitionScore, getEffectiveBpm } from '@/utils/flowScoring';



interface FlowSandboxProps {
  modeId: string; // 'bu' | 'df' | 'ph' | 'cm'
  selectedTrackIds: string[];
  onChangeSelected: (ids: string[]) => void;
}

export function FlowSandbox({ modeId, selectedTrackIds, onChangeSelected }: FlowSandboxProps) {
  // Filter active preset tracks based on current Journey category
  const categoryTracks = React.useMemo(() => {
    return PRESET_TRACKS.filter((track) => track.category === modeId);
  }, [modeId]);

  const toggleTrack = (id: string) => {
    if (selectedTrackIds.includes(id)) {
      onChangeSelected(selectedTrackIds.filter((tId) => tId !== id));
    } else {
      if (selectedTrackIds.length < 5) {
        onChangeSelected([...selectedTrackIds, id]);
      }
    }
  };

  const selectedTracksInOrder = React.useMemo(() => {
    return selectedTrackIds
      .map((id) => PRESET_TRACKS.find((t) => t.id === id))
      .filter((t): t is Track => !!t);
  }, [selectedTrackIds]);

  // Backtracking global sequencing optimizer
  const optimizedTracks = React.useMemo(() => {
    if (selectedTracksInOrder.length !== 5) return [];

    let bestPerm: Track[] = [...selectedTracksInOrder];
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
          nextPenalty = getTransitionPenalty(currentPerm[idx - 1], selectedTracksInOrder[i], modeId, idx);
        }
        
        used[i] = true;
        currentPerm.push(selectedTracksInOrder[i]);
        
        backtrack(idx + 1, currentPenalty + nextPenalty);
        
        currentPerm.pop();
        used[i] = false;
      }
    };

    backtrack(0, 0);
    return bestPerm;
  }, [selectedTracksInOrder, modeId]);

  // Overall journey metrics, feedback summary, and concluding sentence
  const stats = React.useMemo(() => {
    if (selectedTracksInOrder.length !== 5 || optimizedTracks.length !== 5) return null;

    let totalScore = 0;
    for (let i = 0; i < optimizedTracks.length - 1; i++) {
      totalScore += getTransitionScore(optimizedTracks[i], optimizedTracks[i + 1], modeId, i);
    }
    
    const flowScore = Math.max(30, Math.min(100, Math.round(totalScore / 4)));

    let metrics: { name: string; value: number }[] = [];
    let concludingSentence = "";
    let feedbackMessage = "";

    if (modeId === 'bu') {
      const energyAscending = (optimizedTracks[4].energy - optimizedTracks[0].energy);
      const progressionVal = Math.max(40, Math.min(100, Math.round(75 + energyAscending * 50)));
      const confidenceVal = Math.round(optimizedTracks.reduce((acc, t) => acc + t.energy, 0) / 5 * 100);
      const payoffVal = Math.round(optimizedTracks[4].energy * 100);
      const momentumVal = Math.min(100, Math.round(flowScore * 0.9 + (optimizedTracks[4].bpm > optimizedTracks[0].bpm ? 10 : 0)));

      metrics = [
        { name: 'Momentum', value: momentumVal },
        { name: 'Confidence', value: confidenceVal },
        { name: 'Progression', value: progressionVal },
        { name: 'Payoff', value: payoffVal },
      ];
      feedbackMessage = "Every song makes you feel stronger, more confident, and more energetic than the previous one.";
      concludingSentence = "You walk out of this curve standing a little taller than when you entered.";
    } else if (modeId === 'df') {
      const avgEnergy = optimizedTracks.reduce((acc, t) => acc + t.energy, 0) / 5;
      const immersionVal = Math.round(flowScore * 0.95 + 5);
      const smoothnessVal = flowScore;
      const depthVal = Math.round((1 - avgEnergy) * 100);
      const flowStateVal = Math.round((smoothnessVal + immersionVal) / 2);

      metrics = [
        { name: 'Immersion', value: immersionVal },
        { name: 'Smoothness', value: smoothnessVal },
        { name: 'Ambient Depth', value: depthVal },
        { name: 'Flow State', value: flowStateVal },
      ];
      feedbackMessage = "Smooth, atmospheric transitions that preserve mood and ambient energy levels without sharp drops.";
      concludingSentence = "A journey that keeps you perfectly suspended in time.";
    } else if (modeId === 'cm') {
      const targets = [0.65, 0.75, 0.85, 0.60, 0.80];
      let matchCount = 0;
      for (let i = 0; i < 5; i++) {
        if (Math.abs(optimizedTracks[i].energy - targets[i]) <= 0.15) matchCount++;
      }
      const narrativeVal = Math.round(flowScore * 0.85 + matchCount * 3);
      const atmosphereVal = 88;
      const energyRange = Math.max(...optimizedTracks.map(t => t.energy)) - Math.min(...optimizedTracks.map(t => t.energy));
      const emotionalArcVal = Math.round(50 + energyRange * 50);
      const continuityVal = flowScore;

      metrics = [
        { name: 'Narrative', value: narrativeVal },
        { name: 'Atmosphere', value: atmosphereVal },
        { name: 'Emotional Arc', value: emotionalArcVal },
        { name: 'Scene Continuity', value: continuityVal },
      ];
      feedbackMessage = "Every transition feels like another scene in a movie, taking you through acts of a story.";
      concludingSentence = "A sequence that makes life feel like it was filmed on 35mm.";
    } else { // 'ph' -> Unhinged
      let bpmDiffSum = 0;
      for (let i = 0; i < 4; i++) {
        bpmDiffSum += Math.abs(getEffectiveBpm(optimizedTracks[i].bpm) - getEffectiveBpm(optimizedTracks[i+1].bpm));
      }
      const surpriseVal = Math.min(100, Math.round(50 + bpmDiffSum * 0.8));
      const varietyVal = 95;
      const chaosVal = Math.round((flowScore + surpriseVal) / 2);
      const replayVal = Math.round(flowScore * 0.9 + 10);

      metrics = [
        { name: 'Surprise', value: surpriseVal },
        { name: 'Variety', value: varietyVal },
        { name: 'Controlled Chaos', value: chaosVal },
        { name: 'Replay Value', value: replayVal },
      ];
      feedbackMessage = "Break expectations without breaking the listening experience, escalating personality and unpredictability.";
      concludingSentence = "You never see the next turn coming, but you love the ride.";
    }

    return { flowScore, metrics, feedbackMessage, concludingSentence };
  }, [selectedTracksInOrder, optimizedTracks, modeId]);

  return (
    <div className="flex flex-col h-full justify-between gap-3 min-h-0">
      
      {/* 1. Track Selector Header */}
      <div className="shrink-0">
        <div className="flex justify-between items-center mb-1.5 select-none">
          <h4 className="text-[11px] font-black uppercase tracking-tight">1. Build Your Mix (Select 5)</h4>
          <span className={cn(
            "neo-border px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono select-none",
            selectedTrackIds.length === 5 ? "bg-brand-pink text-white border-black animate-none" : "bg-brand-yellow text-black border-black animate-pulse"
          )}>
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
                  "neo-border p-1 rounded-lg text-left flex gap-1 items-center transition-all relative overflow-hidden select-none",
                  isSelected 
                    ? "bg-brand-yellow border-black scale-[0.98] translate-y-[1px]" 
                    : isDisabled 
                      ? "bg-slate-50 border-slate-300 opacity-40 cursor-not-allowed" 
                      : "bg-white border-black hover:translate-y-[-1px] hover:shadow-sm"
                )}
              >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={track.coverUrl} alt={track.name} className="w-6.5 h-6.5 rounded border border-black shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[8.5px] truncate leading-tight">{track.name}</p>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-[7.5px] font-mono font-bold text-slate-500 truncate">{track.artist}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-black text-brand-yellow rounded-full border border-black flex items-center justify-center">
                    <Check className="w-1.5 h-1.5 stroke-[4px]" />
                  </div>
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
                Click {5 - selectedTrackIds.length} more track{5 - selectedTrackIds.length > 1 ? 's' : ''} to align this listening journey.
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
              <div className="flex flex-col bg-[#E8F0FE] border-3 border-black rounded-2xl p-3 relative overflow-hidden neo-shadow h-full min-h-0 justify-between">
                {/* Header */}
                <div className="border-b-3 border-black pb-1.5 mb-2 flex justify-between items-center select-none shrink-0">
                  <span className="text-[10px] font-black uppercase text-brand-blue flex items-center gap-1 font-mono">
                    {modeId === 'bu' && "🚀 Rise Curve Sequence"}
                    {modeId === 'df' && "🌊 Drift Flow Sequence"}
                    {modeId === 'ph' && "😈 Unhinged Contrast Sequence"}
                    {modeId === 'cm' && "🎬 Frame Narrative Sequence"}
                  </span>
                  {stats && (
                    <span className="bg-brand-blue text-black border-2 border-black rounded px-1.5 py-0.5 text-[8.5px] font-black font-mono">
                      Journey Match: {stats.flowScore}%
                    </span>
                  )}
                </div>

                {/* Playlist Scroll Area */}
                <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 scrollbar-thin my-1.5 min-h-0">
                  {optimizedTracks.map((track, idx) => {
                    const nextTrack = optimizedTracks[idx + 1];
                    const hasNext = !!nextTrack;
                    const transScore = hasNext ? getTransitionScore(track, nextTrack, modeId, idx) : 100;
                    
                    let scoreColor = "bg-green-500";
                    let textStatus = "Seamless Blend";
                    if (transScore < 75) {
                      scoreColor = "bg-brand-orange";
                      textStatus = "Tension Bridge";
                    } else if (transScore < 90) {
                      scoreColor = "bg-brand-yellow";
                      textStatus = "Smooth Pivot";
                    }

                    return (
                      <div key={`track-${track.id}`} className="flex flex-col">
                        {/* Track Card */}
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className="bg-white border-2 border-black p-1.5 rounded-lg flex items-center justify-between text-xs neo-shadow-sm select-none"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-4 h-4 rounded bg-black text-white border border-black flex items-center justify-center font-black font-mono text-[8px] shrink-0">
                              {idx + 1}
                            </span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={track.coverUrl} alt={track.name} className="w-6.5 h-6.5 rounded border-2 border-black shrink-0 object-cover" />
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-black truncate text-[10px] leading-tight text-black">{track.name}</p>
                              <p className="font-bold text-[8px] text-slate-500 truncate leading-none mt-0.5">{track.artist}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono font-black text-[8px] uppercase bg-brand-yellow border-2 border-black px-1.5 py-0.5 rounded-md select-none shrink-0 text-black">
                              {track.role}
                            </span>

                            <div className="flex flex-col items-end w-20 sm:w-24 shrink-0">
                              <div className="flex justify-between w-full text-[7.5px] font-mono font-bold leading-none mb-0.5">
                                <span className="text-slate-400">Flow</span>
                                <span className="font-black text-black">
                                  {hasNext ? `${transScore}%` : "🏁 END"}
                                </span>
                              </div>
                              <div className="w-full h-1.5 border-2 border-black rounded bg-slate-100 overflow-hidden relative">
                                <div
                                  className={cn("h-full border-r border-black", scoreColor)}
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
                  <div className="mt-2.5 border-2 border-black bg-white rounded-lg p-2 neo-shadow-sm select-none shrink-0">
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
                          <div className="w-full h-1.5 border border-black rounded bg-slate-100 overflow-hidden relative">
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
