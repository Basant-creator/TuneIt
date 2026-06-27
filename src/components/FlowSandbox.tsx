'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Sparkles, Check, Info } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  key: string;
  energy: number;
  coverUrl: string;
}

const PRESET_TRACKS: Track[] = [
  {
    id: 's1',
    name: 'Simpson Wave 1995',
    artist: 'FrankJavCee',
    bpm: 85,
    key: '2A',
    energy: 0.55,
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=80',
  },
  {
    id: 's2',
    name: 'Crystal Skies',
    artist: 'VXLLAIN, iGRES, ENXK',
    bpm: 103,
    key: '3A',
    energy: 0.65,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=80',
  },
  {
    id: 's3',
    name: 'Coffin Nail',
    artist: 'MF DOOM',
    bpm: 95,
    key: '10B',
    energy: 0.70,
    coverUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=80',
  },
  {
    id: 's4',
    name: 'The Weekend (Radio Edit)',
    artist: 'Michael Gray',
    bpm: 127,
    key: '9A',
    energy: 0.82,
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80',
  },
  {
    id: 's5',
    name: 'Riptide',
    artist: 'Vance Joy',
    bpm: 102,
    key: '12A',
    energy: 0.60,
    coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=80',
  },
  {
    id: 's6',
    name: 'Midnight City',
    artist: 'M83',
    bpm: 105,
    key: '6B',
    energy: 0.75,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80',
  },
  {
    id: 's7',
    name: 'Innerbloom',
    artist: 'RÜFÜS DU SOL',
    bpm: 122,
    key: '8A',
    energy: 0.84,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=80',
  },
  {
    id: 's8',
    name: 'Opus',
    artist: 'Eric Prydz',
    bpm: 126,
    key: '8B',
    energy: 0.88,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80',
  },
];

// Helper to check Camelot key compatibility
function areKeysCompatible(k1: string, k2: string): boolean {
  if (k1 === k2) return true;
  
  const num1 = parseInt(k1.slice(0, -1));
  const letter1 = k1.slice(-1);
  const num2 = parseInt(k2.slice(0, -1));
  const letter2 = k2.slice(-1);

  if (isNaN(num1) || isNaN(num2)) return false;

  if (num1 === num2) return true; // mode shift (relative major/minor)
  if (letter1 === letter2) {
    const diff = Math.abs(num1 - num2);
    if (diff === 1 || diff === 11) return true; // wrap around for 12 <-> 1
  }

  return false;
}

// Calculate transition penalty (for optimizer)
function getTransitionPenalty(t1: Track, t2: Track): number {
  const bpmDiff = Math.abs(t1.bpm - t2.bpm);
  const keyComp = areKeysCompatible(t1.key, t2.key);
  
  let penalty = bpmDiff * 3;
  if (!keyComp) {
    penalty += 15; // penalty for poor harmonic compatibility
  }
  
  return penalty;
}

// Calculate transition score between two tracks (0-100)
function getTransitionScore(t1: Track, t2: Track): number {
  const bpmDiff = Math.abs(t1.bpm - t2.bpm);
  const keyComp = areKeysCompatible(t1.key, t2.key);
  
  // 50 points for BPM difference, 50 points for Key compatibility
  const bpmPoints = Math.max(0, 50 - bpmDiff * 3.5);
  const keyPoints = keyComp ? 50 : 20;
  
  return Math.max(30, Math.min(100, Math.round(bpmPoints + keyPoints)));
}

interface FlowSandboxProps {
  modeId: string; // 'bu' | 'df' | 'ph' | 'cm'
  selectedTrackIds: string[];
  onChangeSelected: (ids: string[]) => void;
}

export function FlowSandbox({ modeId, selectedTrackIds, onChangeSelected }: FlowSandboxProps) {
  const isDrift = modeId === 'df';

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

  // Auto-select the remaining 3 tracks to complete the 8-track pool
  const randomTracks = React.useMemo(() => {
    if (selectedTrackIds.length < 5) return [];
    return PRESET_TRACKS.filter((t) => !selectedTrackIds.includes(t.id));
  }, [selectedTrackIds]);

  // Optimize sequence of the 8 tracks using DFS backtracking (super fast & no heap allocation)
  const optimizedTracks = React.useMemo(() => {
    if (selectedTracksInOrder.length !== 5) return [];
    
    const allTracks = [...selectedTracksInOrder, ...randomTracks];
    if (allTracks.length !== 8) return allTracks;

    if (isDrift) {
      let bestPerm: Track[] = [...allTracks];
      let bestPenalty = Infinity;

      const currentPerm: Track[] = [];
      const used = new Array(8).fill(false);

      const backtrack = (idx: number, currentPenalty: number) => {
        if (currentPenalty >= bestPenalty) return;

        if (idx === 8) {
          bestPenalty = currentPenalty;
          bestPerm = [...currentPerm];
          return;
        }

        for (let i = 0; i < 8; i++) {
          if (used[i]) continue;
          
          let nextPenalty = 0;
          if (idx > 0) {
            nextPenalty = getTransitionPenalty(currentPerm[idx - 1], allTracks[i]);
          }
          
          used[i] = true;
          currentPerm.push(allTracks[i]);
          
          backtrack(idx + 1, currentPenalty + nextPenalty);
          
          currentPerm.pop();
          used[i] = false;
        }
      };

      backtrack(0, 0);
      return bestPerm;
    }
    
    // Default fallback
    return allTracks;
  }, [selectedTracksInOrder, randomTracks, isDrift]);

  // Overall playlist stats and score
  const stats = React.useMemo(() => {
    if (selectedTracksInOrder.length !== 5 || optimizedTracks.length !== 8) return null;

    let totalScore = 0;
    for (let i = 0; i < optimizedTracks.length - 1; i++) {
      totalScore += getTransitionScore(optimizedTracks[i], optimizedTracks[i + 1]);
    }
    
    const flowScore = Math.max(30, Math.min(100, Math.round(totalScore / 7)));

    let feedbackMessage = "";
    if (flowScore >= 90) {
      feedbackMessage = "🌊 Perfect Drift Flow! Your playlist transitions are buttery smooth. The tempo drifts gently and keys lock in harmonically for an uninterrupted state of flow.";
    } else if (flowScore >= 75) {
      feedbackMessage = "⚡ Good Vibes Flow. Solid transitions with minor tempo changes. The groove is maintained nicely, creating a pleasant listening journey.";
    } else if (flowScore >= 60) {
      feedbackMessage = "⚠️ Transition Alerts. There are a few noticeable jumps in tempo or key changes. Some transitions might feel abrupt to listeners.";
    } else {
      feedbackMessage = "💥 Turbulent Energy. High BPM gaps or key clashes detected. Great for high-contrast sets, but lacks a smooth floating drift flow.";
    }

    return { flowScore, feedbackMessage };
  }, [selectedTracksInOrder, optimizedTracks]);

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      
      {/* 1. Track Selector Header */}
      <div>
        <div className="flex justify-between items-center mb-2 select-none">
          <h4 className="text-xs font-black uppercase tracking-tight">1. Build Your Mix (Select 5)</h4>
          <span className={cn(
            "neo-border px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono select-none",
            selectedTrackIds.length === 5 ? "bg-brand-pink text-white border-black animate-none" : "bg-brand-yellow text-black border-black animate-pulse"
          )}>
            Selected: {selectedTrackIds.length}/5
          </span>
        </div>

        {/* Tracks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
          {PRESET_TRACKS.map((track) => {
            const isSelected = selectedTrackIds.includes(track.id);
            const isDisabled = !isSelected && selectedTrackIds.length >= 5;

            return (
              <button
                key={track.id}
                onClick={() => toggleTrack(track.id)}
                disabled={isDisabled}
                className={cn(
                  "neo-border p-1.5 rounded-lg text-left flex gap-1.5 items-center transition-all relative overflow-hidden select-none",
                  isSelected 
                    ? "bg-brand-yellow border-black scale-[0.98] translate-y-[1px]" 
                    : isDisabled 
                      ? "bg-slate-50 border-slate-300 opacity-40 cursor-not-allowed" 
                      : "bg-white border-black hover:translate-y-[-1px] hover:shadow-sm"
                )}
              >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={track.coverUrl} alt={track.name} className="w-7 h-7 rounded border border-black shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[9px] truncate leading-tight">{track.name}</p>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-[8px] font-mono font-bold text-slate-500">{track.bpm} BPM</span>
                    <span className="text-[8px] font-mono font-black bg-slate-100 px-1 rounded shrink-0 border border-slate-200">{track.key}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-black text-brand-yellow rounded-full border border-black flex items-center justify-center">
                    <Check className="w-1.5 h-1.5 stroke-[4px]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Mixer / Output Display */}
      <div className="flex-1 border-t border-dashed border-slate-300 pt-3 flex flex-col justify-center min-h-[350px]">
        <AnimatePresence mode="wait">
          {selectedTrackIds.length < 5 ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-8 font-mono max-w-sm mx-auto select-none"
            >
              <Info className="w-8 h-8 text-brand-pink mx-auto mb-2" />
              <p className="text-xs font-black text-slate-600 uppercase">Awaiting Playlist Construction</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                Click {5 - selectedTrackIds.length} more track{5 - selectedTrackIds.length > 1 ? 's' : ''} to preview the Drift engine alignment rules.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="flex flex-col justify-between bg-[#E8F0FE] border-3 border-black rounded-2xl p-4 relative overflow-hidden neo-shadow h-full">
                {/* Header */}
                <div className="border-b-3 border-black pb-2 mb-3 flex justify-between items-center select-none">
                  <span className="text-xs font-black uppercase text-brand-blue flex items-center gap-1.5 font-mono">
                    🌊 Optimized Drift Flow Sequence
                  </span>
                  {stats && (
                    <span className="bg-brand-blue text-black border-2 border-black rounded px-1.5 py-0.5 text-[9px] font-black font-mono">
                      Score: {stats.flowScore}%
                    </span>
                  )}
                </div>

                {/* Playlist Scroll Area */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin">
                  {optimizedTracks.map((track, idx) => {
                    const nextTrack = optimizedTracks[idx + 1];
                    const hasNext = !!nextTrack;
                    const transScore = hasNext ? getTransitionScore(track, nextTrack) : 100;
                    
                    let scoreColor = "bg-green-500";
                    let textStatus = "Perfect";
                    if (transScore < 75) {
                      scoreColor = "bg-brand-orange";
                      textStatus = "Fair";
                    } else if (transScore < 90) {
                      scoreColor = "bg-brand-yellow";
                      textStatus = "Good";
                    }

                    return (
                      <div key={`track-${track.id}`} className="flex flex-col">
                        {/* Track Card */}
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className="bg-white border-2 border-black p-2 rounded-xl flex items-center justify-between text-xs neo-shadow-sm select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded bg-black text-white border border-black flex items-center justify-center font-black font-mono text-[9px] shrink-0">
                              {idx + 1}
                            </span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={track.coverUrl} alt={track.name} className="w-8 h-8 rounded border-2 border-black shrink-0 object-cover" />
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-black truncate text-[11px] leading-tight text-black">{track.name}</p>
                              <p className="font-bold text-[9px] text-slate-500 truncate leading-none mt-0.5">{track.artist}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-black text-[9px] bg-slate-100 border-2 border-black px-1.5 py-0.5 rounded-md select-none shrink-0 text-slate-800">
                              {track.bpm} BPM
                            </span>

                            <div className="flex flex-col items-end w-24 sm:w-28 shrink-0">
                              <div className="flex justify-between w-full text-[8px] font-mono font-bold leading-none mb-1">
                                <span className="text-slate-400">Flow Balance</span>
                                <span className="font-black text-black">
                                  {hasNext ? `${transScore}%` : "🏁 END"}
                                </span>
                              </div>
                              <div className="w-full h-2 border-2 border-black rounded bg-slate-100 overflow-hidden relative">
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
                          <div className="flex items-center pl-10 my-1 select-none">
                            <div className="w-0.5 h-3 bg-black border-dashed border-l border-black" />
                            <span className="text-[8px] font-mono font-black uppercase text-slate-400 ml-2">
                              Transition Quality: <span className="text-black font-extrabold">{textStatus}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Score Summary & Feedback */}
                {stats && (
                  <div className="mt-4 border-2 border-black bg-white rounded-xl p-3 neo-shadow-sm select-none">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-tight text-black flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-brand-orange fill-current" /> Overall Balance Score:
                      </span>
                      <span className="text-xs font-black font-mono bg-brand-yellow px-2 py-0.5 border-2 border-black rounded-lg">
                        {stats.flowScore} / 100
                      </span>
                    </div>
                    
                    <div className="w-full h-4 border-3 border-black rounded-lg bg-slate-100 overflow-hidden mb-2 relative shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                      <div 
                        className={cn(
                          "h-full border-r-3 border-black transition-all duration-500",
                          stats.flowScore >= 90 
                            ? "bg-brand-blue" 
                            : stats.flowScore >= 75 
                              ? "bg-brand-yellow" 
                              : "bg-brand-orange"
                        )}
                        style={{ width: `${stats.flowScore}%` }}
                      />
                    </div>
                    
                    <p className="text-[9px] font-mono font-bold leading-normal text-slate-700">
                      {stats.feedbackMessage}
                    </p>
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
