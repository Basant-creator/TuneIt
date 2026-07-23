'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Play, Sparkles, AlertCircle, Share2, CheckCircle2, ExternalLink, X, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';
import { SpinningBlocks } from '@/components/SpinningBlocks';
import { cn } from '@/utils/cn';
import { flowModes } from '@/data/homeData';

interface Track {
  videoId: string;
  title: string;
  artist: string;
  estimatedBpm?: number;
  intensityScore?: number;
  originalIndex?: number;
  displayIndex?: number;
}

export default function PlaylistModifierPage() {
  const router = useRouter();
  const params = useParams();
  const playlistId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [originalTracks, setOriginalTracks] = React.useState<Track[]>([]);
  const [displayTracks, setDisplayTracks] = React.useState<Track[]>([]);
  const [harshTracks, setHarshTracks] = React.useState<Track[]>([]);

  const [selectedMode, setSelectedMode] = React.useState('df'); // Default to drift
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Export to YouTube Music modal state
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [exportTitle, setExportTitle] = React.useState('TuneIt Flow - Optimized Playlist');
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportedPlaylistUrl, setExportedPlaylistUrl] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  // Fetch original tracks on mount
  React.useEffect(() => {
    const fetchTracks = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:3001/api/playlists/${playlistId}/tracks`);
        if (!res.ok) throw new Error('Failed to fetch playlist tracks');

        const data = await res.json();
        const rawTracks = data.tracks?.map((t: any, i: number) => ({
          ...t,
          displayIndex: i + 1
        })) || [];
        setOriginalTracks(rawTracks);
        setDisplayTracks(rawTracks);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTracks();
  }, [playlistId]);

  // Handle shuffling illusion
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && !isComplete) {
      interval = setInterval(() => {
        setDisplayTracks(prev => {
          const shuffled = [...prev];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        });
      }, 1500); // Slower shuffle every 1500ms
    }
    return () => clearInterval(interval);
  }, [isGenerating, isComplete]);

  const handleApplyFlow = async () => {
    if (selectedMode !== 'df') return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`http://127.0.0.1:3001/api/playlists/${playlistId}/drift`, {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process playlist');
      }

      // Final ordered tracks get a fresh 1..N index
      const finalTracks = (data.tracks || []).map((t: any, i: number) => ({
        ...t,
        displayIndex: i + 1
      }));
      setDisplayTracks(finalTracks);
      setHarshTracks(data.harshTracks || []);
      setIsComplete(true);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setDisplayTracks(originalTracks); // Revert to original on error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPlaylist = async () => {
    if (!exportTitle.trim()) {
      setExportError('Playlist title cannot be empty');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const videoIds = displayTracks.map(t => t.videoId);
      const res = await fetch('http://127.0.0.1:3001/api/playlists/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: exportTitle.trim(),
          videoIds,
          description: `Optimized playlist flow (${displayTracks.length} tracks) created with TuneIt.`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to export playlist');
      }

      setExportedPlaylistUrl(data.playlist?.url || `https://music.youtube.com/playlist?list=${data.playlist?.id}`);
    } catch (err: any) {
      console.error('[Export Error]', err);
      setExportError(err.message || 'Failed to export playlist');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FFE5] text-black relative pb-24">
      {/* HEADER */}
      <header className="w-full py-5 px-6 md:px-12 border-b-3 border-black bg-white flex items-center sticky top-0 z-50 select-none">
        <NeoButton color="white" size="sm" onClick={() => router.push('/playlists')}>
          <ArrowLeft className="w-4 h-4 mr-2 inline" />
          Back to Playlists
        </NeoButton>
      </header>

      <main className="max-w-6xl mx-auto py-10 px-6">

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 mt-20">
            <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
            <p className="font-mono font-black uppercase text-sm">Fetching tracks...</p>
          </div>
        ) : error && !isGenerating ? (
          <div className="bg-red-100 neo-border border-black p-6 rounded-2xl flex flex-col items-center justify-center text-center mt-12">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-black uppercase text-red-600 mb-2">Error</h2>
            <p className="font-mono font-bold text-slate-700">{error}</p>
            <NeoButton color="white" className="mt-6" onClick={() => window.location.reload()}>Retry</NeoButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* LEFT COLUMN: Controls & Modes */}
            <div className="lg:col-span-5 sticky top-[100px]">
              <div className="bg-white neo-border border-black rounded-3xl p-6 relative">

                {isComplete && (
                  <div className="absolute -top-6 -right-6 z-10">
                    <Sticker color="pink" rotation={10} size="sm">
                      PERFECTED!
                    </Sticker>
                  </div>
                )}

                <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
                  Shape Your Flow
                </h1>
                <p className="font-mono text-xs font-bold text-slate-500 mb-6">
                  {originalTracks.length} tracks in this playlist
                </p>

                {/* Modes Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {flowModes.map(mode => {
                    const isSelected = selectedMode === mode.id;
                    const isDisabled = isGenerating || isComplete;

                    return (
                      <button
                        key={mode.id}
                        disabled={isDisabled}
                        onClick={() => setSelectedMode(mode.id)}
                        className={cn(
                          "text-left p-3 rounded-2xl border-2 border-black transition-all relative overflow-hidden flex flex-col",
                          isSelected
                            ? "bg-black text-white shadow-none translate-y-1"
                            : "bg-white hover:-translate-y-1 hover:neo-shadow active:translate-y-0 text-black",
                          isDisabled && !isSelected && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {mode.emoji && <span className="text-2xl">{mode.emoji}</span>}
                          <h3 className="font-black uppercase text-sm">{mode.title}</h3>
                        </div>
                        <p className={cn(
                          "font-mono text-[10px] leading-tight font-medium flex-1",
                          isSelected ? "text-slate-300" : "text-slate-500"
                        )}>
                          {mode.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {/* Action Area */}
                {!isComplete ? (
                  <div className="space-y-4">
                    {selectedMode !== 'df' && (
                      <p className="font-mono text-[10px] font-black text-brand-orange bg-orange-50 border border-brand-orange p-2 rounded-lg text-center uppercase">
                        This mode engine is currently offline. Select Drift to continue.
                      </p>
                    )}

                    <NeoButton
                      color="yellow"
                      className="w-full justify-center h-14"
                      disabled={selectedMode !== 'df' || isGenerating}
                      onClick={handleApplyFlow}
                    >
                      {isGenerating ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          ANALYZING & SORTING...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Play className="w-5 h-5 fill-current" />
                          APPLY {flowModes.find(m => m.id === selectedMode)?.title.toUpperCase()} FLOW
                        </span>
                      )}
                    </NeoButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-brand-blue/20 border-2 border-brand-blue p-4 rounded-xl text-center">
                      <h4 className="font-black uppercase text-brand-blue flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Flow Applied Successfully
                      </h4>
                    </div>

                    <NeoButton
                      color="yellow"
                      className="w-full justify-center h-14 font-black"
                      onClick={() => {
                        setExportTitle(`TuneIt Flow - ${flowModes.find(m => m.id === selectedMode)?.title || 'Optimized'}`);
                        setExportError(null);
                        setExportedPlaylistUrl(null);
                        setIsExportModalOpen(true);
                      }}
                    >
                      <Share2 className="w-5 h-5 mr-2 inline" />
                      EXPORT TO YOUTUBE MUSIC
                    </NeoButton>

                    <NeoButton
                      color="white"
                      className="w-full justify-center"
                      onClick={() => {
                        setIsComplete(false);
                        setDisplayTracks(originalTracks);
                        setHarshTracks([]);
                      }}
                    >
                      Reset and Try Again
                    </NeoButton>
                  </div>
                )}

              </div>
            </div>

            {/* RIGHT COLUMN: Tracks Visualizer */}
            <div className="lg:col-span-7 space-y-6">

              {/* Main Sequence */}
              <div className="bg-white neo-border border-black rounded-3xl p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-4">
                  <h2 className="text-xl font-black uppercase">
                    {isComplete ? 'Optimized Sequence' : 'Current Sequence'}
                  </h2>
                  <span className="font-mono text-xs font-black bg-black text-white px-2 py-1 rounded-md">
                    {displayTracks.length} Tracks
                  </span>
                </div>

                <div className="relative">
                  {isGenerating && (
                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                      <div className="bg-white/80 neo-border border-black p-6 rounded-3xl flex flex-col items-center shadow-lg backdrop-blur-sm pointer-events-auto">
                        <SpinningBlocks />
                        <p className="mt-4 font-black uppercase text-brand-pink tracking-widest text-sm animate-pulse">Syncing Vibes...</p>
                      </div>
                    </div>
                  )}

                  <div className={cn(
                    "transition-all duration-1000 max-h-[60vh] overflow-y-auto pr-2",
                    isGenerating && "blur-[6px] opacity-40 grayscale-[30%] pointer-events-none overflow-hidden"
                  )}>
                    <ul className="space-y-2 flex flex-col relative">
                      <AnimatePresence>
                        {displayTracks.map((track, idx) => (
                          <motion.li
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{
                              type: "spring",
                              stiffness: 80,
                              damping: 20,
                              duration: 1.2
                            }}
                            key={track.videoId}
                            className="flex items-center gap-4 bg-slate-50 border-2 border-black rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow relative bg-white"
                          >
                            <div className="w-8 h-8 rounded-full bg-brand-yellow neo-border border-black flex items-center justify-center font-black shrink-0 text-sm">
                              {track.displayIndex || idx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-sm truncate">{track.title}</h4>
                              <p className="font-mono text-[10px] text-slate-500 truncate font-bold">{track.artist}</p>
                            </div>

                            {track.estimatedBpm && (
                              <div className="flex gap-3 shrink-0 text-right">
                                <div className="flex flex-col">
                                  <span className="font-mono text-[9px] uppercase font-black text-slate-400">BPM</span>
                                  <span className="font-black text-xs">{Math.round(track.estimatedBpm)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-mono text-[9px] uppercase font-black text-slate-400">NRG</span>
                                  <span className="font-black text-xs text-brand-pink">{track.intensityScore?.toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Harsh Tracks Excluded */}
              {isComplete && harshTracks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#FFE5E5] border-3 border-red-500 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-black uppercase text-red-700">Excluded (Harsh Vibe Check)</h2>
                  </div>

                  <p className="font-mono text-xs font-bold text-red-600 mb-4">
                    These tracks completely ruined the {flowModes.find(m => m.id === selectedMode)?.title} aesthetic. We removed them to save your flow.
                  </p>

                  <div className="max-h-[30vh] overflow-y-auto pr-2">
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {harshTracks.map((track) => (
                        <li key={track.videoId} className="bg-white border-2 border-red-500 p-2 rounded-xl flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-[11px] truncate">{track.title}</h4>
                            <p className="font-mono text-[9px] text-slate-500 truncate">{track.artist}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        )}
      </main>

      {/* EXPORT TO YOUTUBE MUSIC MODAL */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white neo-border border-black rounded-3xl p-6 md:p-8 max-w-lg w-full relative shadow-2xl"
            >
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-black p-2 rounded-full transition-colors"
                disabled={isExporting}
              >
                <X className="w-6 h-6" />
              </button>

              {!exportedPlaylistUrl ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-yellow neo-border border-black flex items-center justify-center font-black">
                      <Music className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase">Export Playlist</h2>
                      <p className="font-mono text-xs font-bold text-slate-500">Save your optimized sequence to YouTube Music</p>
                    </div>
                  </div>

                  <div className="space-y-4 my-6">
                    <div>
                      <label className="block font-mono text-xs font-black uppercase text-slate-700 mb-2">
                        Playlist Name
                      </label>
                      <input
                        type="text"
                        value={exportTitle}
                        onChange={(e) => setExportTitle(e.target.value)}
                        placeholder="Enter playlist name..."
                        disabled={isExporting}
                        className="w-full bg-slate-50 border-2 border-black rounded-xl p-3 font-bold font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow text-black"
                      />
                    </div>

                    <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 font-mono text-xs text-slate-600 font-bold flex justify-between items-center">
                      <span>Tracks to export:</span>
                      <span className="font-black text-black bg-white px-2 py-1 rounded-md border border-black">{displayTracks.length}</span>
                    </div>

                    {exportError && (
                      <div className="bg-red-50 border border-red-300 text-red-600 p-3 rounded-xl font-mono text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{exportError}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <NeoButton
                      color="white"
                      className="flex-1 justify-center"
                      onClick={() => setIsExportModalOpen(false)}
                      disabled={isExporting}
                    >
                      Cancel
                    </NeoButton>

                    <NeoButton
                      color="yellow"
                      className="flex-1 justify-center"
                      onClick={handleExportPlaylist}
                      disabled={isExporting || !exportTitle.trim()}
                    >
                      {isExporting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          EXPORTING...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          CREATE PLAYLIST
                        </span>
                      )}
                    </NeoButton>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-green-100 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black uppercase text-slate-900">Playlist Exported!</h2>
                    <p className="font-mono text-xs font-bold text-slate-500 mt-1">
                      "{exportTitle}" was successfully created on YouTube Music.
                    </p>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <a
                      href={exportedPlaylistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-brand-yellow neo-border border-black font-black uppercase py-3 px-6 rounded-2xl shadow-md hover:-translate-y-1 transition-all text-black"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Open in YouTube Music
                    </a>

                    <NeoButton
                      color="white"
                      className="w-full justify-center"
                      onClick={() => setIsExportModalOpen(false)}
                    >
                      Close
                    </NeoButton>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
