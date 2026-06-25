'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Sparkles, ArrowRight, Check, Info } from 'lucide-react';

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
    name: 'Midnight City',
    artist: 'M83',
    bpm: 105,
    key: '6B',
    energy: 0.75,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80',
  },
  {
    id: 's2',
    name: 'Innerbloom',
    artist: 'RÜFÜS DU SOL',
    bpm: 122,
    key: '8A',
    energy: 0.84,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=80',
  },
  {
    id: 's3',
    name: 'Opus',
    artist: 'Eric Prydz',
    bpm: 126,
    key: '8B',
    energy: 0.88,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80',
  },
  {
    id: 's4',
    name: 'Intro',
    artist: 'The xx',
    bpm: 120,
    key: '5A',
    energy: 0.35,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80',
  },
  {
    id: 's5',
    name: 'Language',
    artist: 'Porter Robinson',
    bpm: 128,
    key: '8B',
    energy: 0.89,
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80',
  },
  {
    id: 's6',
    name: 'Strobe',
    artist: 'deadmau5',
    bpm: 128,
    key: '10A',
    energy: 0.72,
    coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=80',
  },
  {
    id: 's7',
    name: 'Adagio for Strings',
    artist: 'Tiësto',
    bpm: 138,
    key: '7A',
    energy: 0.95,
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=80',
  },
  {
    id: 's8',
    name: 'Clarity',
    artist: 'Zedd',
    bpm: 128,
    key: '7B',
    energy: 0.80,
    coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=80',
  },
];

// Helper to check Camelot key compatibility
// A key signature matches if:
// 1. Identical key
// 2. Same number, opposite letter (8A <-> 8B)
// 3. Difference of exactly 1 in number, same letter (8A <-> 9A, 12A <-> 1A)
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

// Calculate the quality of transition between two tracks (specifically for Drift)
// Returns a lower score for better/smoother transitions
function getTransitionPenalty(t1: Track, t2: Track): number {
  const bpmDiff = Math.abs(t1.bpm - t2.bpm);
  const keyComp = areKeysCompatible(t1.key, t2.key);
  
  // High BPM shifts are heavily penalized for Drift
  // Key mismatch adds a small penalty
  let score = bpmDiff * 2;
  if (!keyComp) {
    score += 15; // penalty for poor harmonic compatibility
  }
  
  return score;
}

// Permute array helper
function permute<T>(arr: T[]): T[][] {
  if (arr.length === 0) return [[]];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const permutations = permute(rest);
    for (const p of permutations) {
      result.push([arr[i], ...p]);
    }
  }
  return result;
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
      if (selectedTrackIds.length < 4) {
        onChangeSelected([...selectedTrackIds, id]);
      }
    }
  };

  const selectedTracksInOrder = React.useMemo(() => {
    return selectedTrackIds
      .map((id) => PRESET_TRACKS.find((t) => t.id === id))
      .filter((t): t is Track => !!t);
  }, [selectedTrackIds]);

  const optimizedTracks = React.useMemo(() => {
    if (selectedTracksInOrder.length !== 4) return [];
    
    // We only implement Drift ('df') sorting for now
    if (isDrift) {
      const allPermutations = permute(selectedTracksInOrder);
      let bestPerm = allPermutations[0];
      let bestPenalty = Infinity;

      for (const perm of allPermutations) {
        let totalPenalty = 0;
        for (let i = 0; i < perm.length - 1; i++) {
          totalPenalty += getTransitionPenalty(perm[i], perm[i + 1]);
        }
        if (totalPenalty < bestPenalty) {
          bestPenalty = totalPenalty;
          bestPerm = perm;
        }
      }
      return bestPerm;
    }
    
    // Default fallback (keep original order)
    return selectedTracksInOrder;
  }, [selectedTracksInOrder, isDrift]);

  // Statistics
  const stats = React.useMemo(() => {
    if (selectedTracksInOrder.length !== 4 || optimizedTracks.length !== 4) return null;

    const getStatsForOrder = (tracks: Track[]) => {
      let totalBpmDiff = 0;
      let compatibleTransitions = 0;
      for (let i = 0; i < tracks.length - 1; i++) {
        totalBpmDiff += Math.abs(tracks[i].bpm - tracks[i + 1].bpm);
        if (areKeysCompatible(tracks[i].key, tracks[i + 1].key)) {
          compatibleTransitions++;
        }
      }
      const maxBpmJump = Math.max(...tracks.slice(0, -1).map((t, idx) => Math.abs(t.bpm - tracks[idx + 1].bpm)));
      return { totalBpmDiff, compatibleTransitions, maxBpmJump };
    };

    const before = getStatsForOrder(selectedTracksInOrder);
    const after = getStatsForOrder(optimizedTracks);

    // Calculate score (out of 100)
    // Max BPM jump under 5 is ideal, every BPM jump above 5 penalizes. Key compatibility rewards.
    const rawScore = 100 - after.maxBpmJump * 2 - (3 - after.compatibleTransitions) * 10;
    const flowScore = Math.max(50, Math.min(99, Math.round(rawScore)));

    return { before, after, flowScore };
  }, [selectedTracksInOrder, optimizedTracks]);

  return (
    <div className="flex flex-col h-full justify-between">
      
      {/* 1. Track Selector Header */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-black uppercase tracking-tight">1. Build Your Mix (Select 4)</h4>
          <span className={cn(
            "neo-border px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono select-none",
            selectedTrackIds.length === 4 ? "bg-brand-pink text-white border-black" : "bg-brand-yellow text-black border-black animate-pulse"
          )}>
            Selected: {selectedTrackIds.length}/4
          </span>
        </div>

        {/* Tracks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
          {PRESET_TRACKS.map((track) => {
            const isSelected = selectedTrackIds.includes(track.id);
            const isDisabled = !isSelected && selectedTrackIds.length >= 4;

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
      <div className="flex-1 border-t border-dashed border-slate-300 pt-3 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {selectedTrackIds.length < 4 ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-8 font-mono max-w-sm mx-auto"
            >
              <Info className="w-8 h-8 text-brand-pink mx-auto mb-2" />
              <p className="text-xs font-black text-slate-600 uppercase">Awaiting Playlist Construction</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                Click {4 - selectedTrackIds.length} more track{4 - selectedTrackIds.length > 1 ? 's' : ''} to preview the Drift engine alignment rules.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full"
            >
              {/* Before Column */}
              <div className="flex flex-col justify-between bg-slate-50 border-2 border-black rounded-xl p-2">
                <div className="border-b border-black pb-1.5 mb-1.5 flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase text-brand-orange">1. Chaotic Selection Order</span>
                </div>
                <div className="space-y-1 flex-1">
                  {selectedTracksInOrder.map((track, idx) => (
                    <div
                      key={`before-${track.id}`}
                      className="bg-white border-2 border-black p-1 rounded-md flex items-center justify-between text-[9px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-black flex items-center justify-center font-bold font-mono text-[8px]">{idx + 1}</span>
                        <span className="font-extrabold truncate">{track.name}</span>
                      </div>
                      <div className="flex gap-2 font-mono text-[8px] text-right font-bold shrink-0">
                        <span>{track.bpm} BPM</span>
                        <span className="bg-slate-100 border border-slate-300 px-1 rounded text-[7px] font-black">{track.key}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* After Column (Optimized) */}
              <div className="flex flex-col justify-between bg-[#E8F0FE] border-2 border-black rounded-xl p-2 relative overflow-hidden">
                <div className="border-b border-black pb-1.5 mb-1.5 flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase text-brand-blue flex items-center gap-1">
                    2. Drift Flow Sequence 🌊
                  </span>
                  {stats && (
                    <span className="bg-brand-blue text-black border border-black rounded text-[8px] font-black px-1">
                      Score: {stats.flowScore}%
                    </span>
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  {optimizedTracks.map((track, idx) => {
                    const nextTrack = optimizedTracks[idx + 1];
                    const isKeyCompatible = nextTrack ? areKeysCompatible(track.key, nextTrack.key) : true;
                    return (
                      <motion.div
                        layout
                        key={`after-${track.id}`}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className="bg-white border-2 border-black p-1 rounded-md flex items-center justify-between text-[9px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-3.5 h-3.5 rounded bg-brand-blue text-black border border-black flex items-center justify-center font-black font-mono text-[8px]">{idx + 1}</span>
                          <span className="font-extrabold truncate">{track.name}</span>
                        </div>
                        <div className="flex gap-1.5 font-mono text-[8px] text-right font-bold shrink-0 items-center">
                          <span>{track.bpm} BPM</span>
                          <span className={cn(
                            "border px-1 rounded text-[8px] font-black",
                            isKeyCompatible ? "bg-brand-blue/30 border-brand-blue text-black" : "bg-slate-100 border-slate-300 text-slate-600"
                          )}>
                            {track.key}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Footer Stats Summary (Show only when 4 are selected) */}
      {stats && (
        <div className="mt-2 p-1.5 bg-slate-50 border-2 border-black rounded-lg text-[8px] font-mono font-bold flex justify-between items-center select-none">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-orange fill-current" />
            <span>Max BPM Jump:</span>
            <span className="line-through text-slate-400 font-normal">{stats.before.maxBpmJump} BPM</span>
            <span className="text-brand-blue font-black">{stats.after.maxBpmJump} BPM</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Harmonic Transitions:</span>
            <span className="line-through text-slate-400 font-normal">{stats.before.compatibleTransitions}/3</span>
            <span className="text-brand-pink font-black">{stats.after.compatibleTransitions}/3 Match</span>
          </div>
        </div>
      )}

    </div>
  );
}
