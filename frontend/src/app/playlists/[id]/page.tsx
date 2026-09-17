'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Play,
  Sparkles,
  AlertCircle,
  Share2,
  CheckCircle2,
  ExternalLink,
  X,
  Music,
  Plus,
  Volume2,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';
import { SpinningBlocks } from '@/components/SpinningBlocks';
import { AudioPreviewModal } from '@/components/AudioPreviewModal';
import { FlowStatsPanel } from '@/components/FlowStatsPanel';
import { FlowEnergyChart } from '@/components/FlowEnergyChart';
import { TrackList } from '@/components/TrackList';
import { cn } from '@/utils/cn';
import { flowModes } from '@/data/homeData';
import { decodeHtmlEntities } from '@/utils/decodeHtml';
import { downloadPlaylistCSV } from '@/utils/csvExporter';
import { api, ApiError } from '@/services/api';
import type {
  FlowEngineResponse,
  FlowMode,
  FlowTrack as Track,
  RecommendedTrack,
} from '@/types/flow';

export default function PlaylistModifierPage() {
  const router = useRouter();
  const params = useParams();
  const playlistId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [originalTracks, setOriginalTracks] = React.useState<Track[]>([]);
  const [displayTracks, setDisplayTracks] = React.useState<Track[]>([]);
  const [harshTracks, setHarshTracks] = React.useState<Track[]>([]);

  const [selectedMode, setSelectedMode] = React.useState<FlowMode>('bu');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = React.useState(false);

  // Full engine response: metrics, segment labels and excluded tracks.
  const [flowResult, setFlowResult] = React.useState<FlowEngineResponse | null>(null);

  // Active pill sequence tab ('chaotic' | 'optimized' | 'recommendations' | 'harsh')
  const [activeSequenceTab, setActiveSequenceTab] = React.useState<'chaotic' | 'optimized' | 'recommendations' | 'harsh'>('optimized');

  // Recommendations state
  const [recommendations, setRecommendations] = React.useState<RecommendedTrack[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = React.useState(false);
  const [hasFetchedRecommendations, setHasFetchedRecommendations] = React.useState(false);

  // 15s Audio Preview Modal state
  const [previewTrack, setPreviewTrack] = React.useState<Track | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // Export to YouTube Music modal state
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [exportTitle, setExportTitle] = React.useState('TuneIt Flow - Optimized Playlist');
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportedPlaylistUrl, setExportedPlaylistUrl] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  // Fetch original tracks on mount
  React.useEffect(() => {
    let isMounted = true;

    const fetchTracks = async () => {
      try {
        const tracks = await api.getPlaylistTracks(playlistId);
        const rawTracks = tracks.map((t, i) => ({ ...t, displayIndex: i + 1 }));

        if (isMounted) {
          setOriginalTracks(rawTracks);
          setDisplayTracks(rawTracks);
        }
      } catch (err: unknown) {
        console.error(err);
        if (!isMounted) return;
        if (err instanceof ApiError && err.isAuthError) {
          setNeedsAuth(true);
          setError('Your YouTube session expired. Reconnect to continue.');
        } else if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTracks();

    return () => {
      isMounted = false;
    };
  }, [playlistId]);

  // Handle shuffling illusion during generation
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && !isComplete) {
      interval = setInterval(() => {
        setDisplayTracks((prev) => {
          const shuffled = [...prev];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isComplete]);

  const handleApplyFlow = async () => {
    setIsGenerating(true);
    setError(null);
    setRecommendations([]);

    try {
      const result = await api.rearrange(playlistId, selectedMode);

      // Final ordered tracks get a fresh 1..N index
      const finalTracks = result.tracks.map((t, i) => ({ ...t, displayIndex: i + 1 }));
      setFlowResult(result);
      setDisplayTracks(finalTracks);
      setHarshTracks(result.harshTracks ?? []);
      setIsComplete(true);
      setActiveSequenceTab('optimized');

      // Recommendations are fetched lazily when the tab is opened — each run
      // costs 4 YouTube search calls (~400 quota units).
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof ApiError) {
        setNeedsAuth(err.isAuthError);
        setError(err.message);
        // A 422 still tells us which tracks the engine rejected and why.
        if (err.code === 'NO_TRACKS_RETAINED') {
          setHarshTracks((err.payload?.harshTracks as Track[]) ?? []);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      }
      setDisplayTracks(originalTracks); // Revert to original on error
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchRecommendations = React.useCallback(async () => {
    setIsLoadingRecommendations(true);
    try {
      setRecommendations(await api.getRecommendations(playlistId));
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setIsLoadingRecommendations(false);
      setHasFetchedRecommendations(true);
    }
  }, [playlistId]);

  /** Opens the recommendations tab, fetching the list on first view. */
  const handleOpenRecommendations = () => {
    setActiveSequenceTab('recommendations');
    if (!hasFetchedRecommendations && !isLoadingRecommendations) {
      fetchRecommendations();
    }
  };

  const handleAddRecommendation = (recTrack: RecommendedTrack) => {
    // Append recommended track to active display tracks
    setDisplayTracks((prev) => {
      const exists = prev.some((t) => t.videoId === recTrack.videoId);
      if (exists) return prev;

      const newTrack: Track = {
        videoId: recTrack.videoId,
        title: recTrack.title,
        artist: recTrack.artist,
        estimatedBpm: recTrack.estimatedBpm,
        intensityScore: recTrack.intensityScore,
        vibeReview: recTrack.vibeReview,
        displayIndex: prev.length + 1,
      };
      return [...prev, newTrack];
    });

    // Remove added track from recommendation pool
    setRecommendations((prev) => prev.filter((r) => r.videoId !== recTrack.videoId));
  };

  const handleOpenPreview = (track: Track) => {
    setPreviewTrack(track);
    setIsPreviewOpen(true);
  };

  const handleDownloadCSV = () => {
    downloadPlaylistCSV(exportTitle, displayTracks, recommendations);
  };

  const handleExportPlaylist = async () => {
    if (!exportTitle.trim()) {
      setExportError('Playlist title cannot be empty');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const engineName = flowModes.find((m) => m.id === selectedMode)?.title ?? 'Optimized';
      const data = await api.exportPlaylist({
        title: exportTitle.trim(),
        videoIds: displayTracks.map((t) => t.videoId),
        description: `${engineName} flow — ${displayTracks.length} tracks sequenced with TuneIt.`,
      });

      setExportedPlaylistUrl(
        data.playlist?.url || `https://music.youtube.com/playlist?list=${data.playlist?.id}`
      );
    } catch (err: unknown) {
      console.error('[Export Error]', err);
      if (err instanceof Error) setExportError(err.message);
      else setExportError('Failed to export playlist');
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
          <div className="flex flex-col w-full">
            {/* Top Level Pill Navigation Bar (Single Straight Line) when Completed */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full bg-white neo-border border-2 border-black p-2 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-row flex-nowrap items-center justify-between overflow-x-auto whitespace-nowrap gap-2 mb-8 select-none"
              >
                <button
                  type="button"
                  onClick={() => setActiveSequenceTab('chaotic')}
                  className={cn(
                    'flex-1 min-w-[160px] px-4 py-2.5 rounded-full font-black uppercase text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                    activeSequenceTab === 'chaotic'
                      ? 'bg-brand-orange text-white neo-border-xs border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-transparent text-black hover:bg-slate-100'
                  )}
                >
                  <span>1. Chaotic Sequence</span>
                  <span
                    className={cn(
                      'font-mono text-[10px] px-2 py-0.5 rounded-full border border-black font-black shrink-0',
                      activeSequenceTab === 'chaotic' ? 'bg-white text-black' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {originalTracks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSequenceTab('optimized')}
                  className={cn(
                    'flex-1 min-w-[150px] px-4 py-2.5 rounded-full font-black uppercase text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                    activeSequenceTab === 'optimized'
                      ? 'bg-brand-orange text-white neo-border-xs border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-transparent text-black hover:bg-slate-100'
                  )}
                >
                  <span>2. Optimized</span>
                  <span
                    className={cn(
                      'font-mono text-[10px] px-2 py-0.5 rounded-full border border-black font-black shrink-0',
                      activeSequenceTab === 'optimized' ? 'bg-white text-black' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {displayTracks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenRecommendations}
                  className={cn(
                    'flex-1 min-w-[170px] px-4 py-2.5 rounded-full font-black uppercase text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                    activeSequenceTab === 'recommendations'
                      ? 'bg-brand-orange text-white neo-border-xs border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-transparent text-black hover:bg-slate-100'
                  )}
                >
                  <span>3. Recommendation</span>
                  <span
                    className={cn(
                      'font-mono text-[10px] px-2 py-0.5 rounded-full border border-black font-black shrink-0',
                      activeSequenceTab === 'recommendations' ? 'bg-white text-black' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {recommendations.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSequenceTab('harsh')}
                  className={cn(
                    'flex-1 min-w-[160px] px-4 py-2.5 rounded-full font-black uppercase text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                    activeSequenceTab === 'harsh'
                      ? 'bg-brand-orange text-white neo-border-xs border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-transparent text-black hover:bg-slate-100'
                  )}
                >
                  <span>4. Harsh Songs</span>
                  <span
                    className={cn(
                      'font-mono text-[10px] px-2 py-0.5 rounded-full border border-black font-black shrink-0',
                      activeSequenceTab === 'harsh' ? 'bg-white text-black' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {harshTracks.length}
                  </span>
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
              {/* LEFT COLUMN: Shape Your Flow Controls */}
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
                    {flowModes.map((mode) => {
                      const isSelected = selectedMode === mode.id;
                      const isDisabled = isGenerating || isComplete;

                      return (
                        <button
                          key={mode.id}
                          disabled={isDisabled}
                          onClick={() => setSelectedMode(mode.id as FlowMode)}
                          className={cn(
                            'text-left p-3 rounded-2xl border-2 border-black transition-all relative overflow-hidden flex flex-col',
                            isSelected
                              ? 'bg-black text-white shadow-none translate-y-1'
                              : 'bg-white hover:-translate-y-1 hover:neo-shadow active:translate-y-0 text-black',
                            isDisabled && !isSelected && 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-black uppercase text-sm">{mode.title}</h3>
                            {isSelected && (
                              <span className="ml-auto w-2 h-2 rounded-full bg-brand-yellow shrink-0" />
                            )}
                          </div>
                          <p
                            className={cn(
                              'font-mono text-[10px] leading-tight font-medium flex-1',
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            )}
                          >
                            {mode.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Action Area */}
                  {!isComplete ? (
                    <div className="space-y-4">
                      <p className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 p-2.5 rounded-lg leading-relaxed">
                        {flowModes.find((m) => m.id === selectedMode)?.description}
                      </p>

                      {error && (
                        <div className="font-mono text-[10px] font-black text-red-600 bg-red-50 border-2 border-red-400 p-2.5 rounded-lg space-y-2">
                          <p className="uppercase leading-relaxed">{error}</p>
                          {needsAuth && (
                            <a
                              href={api.loginUrl()}
                              className="block bg-brand-yellow border-2 border-black rounded-lg py-1.5 text-center text-black uppercase"
                            >
                              Reconnect YouTube Music
                            </a>
                          )}
                        </div>
                      )}

                      <NeoButton
                        color="yellow"
                        className="w-full justify-center h-14"
                        disabled={isGenerating || originalTracks.length === 0}
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
                            APPLY {flowModes.find((m) => m.id === selectedMode)?.title.toUpperCase()} FLOW
                          </span>
                        )}
                      </NeoButton>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-brand-blue/20 border-2 border-brand-blue p-4 rounded-xl text-center">
                        <h4 className="font-black uppercase text-brand-blue flex items-center justify-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Flow Applied Successfully
                        </h4>
                      </div>

                      <NeoButton
                        color="yellow"
                        className="w-full justify-center h-12 font-black"
                        onClick={() => {
                          setExportTitle(`TuneIt Flow - ${flowModes.find((m) => m.id === selectedMode)?.title || 'Optimized'}`);
                          setExportError(null);
                          setExportedPlaylistUrl(null);
                          setIsExportModalOpen(true);
                        }}
                      >
                        <Share2 className="w-5 h-5 mr-2 inline" />
                        EXPORT TO YOUTUBE MUSIC
                      </NeoButton>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -1.5 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        onClick={handleDownloadCSV}
                        className="w-full bg-brand-yellow neo-border border-2 border-black py-3.5 px-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2.5 shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-black cursor-pointer group"
                      >
                        <motion.div
                          animate={{ y: [0, -2, 0] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                        >
                          <Download className="w-4 h-4 text-brand-pink group-hover:scale-110 transition-transform fill-current" />
                        </motion.div>
                        <span>DOWNLOAD UNIVERSAL CSV</span>
                      </motion.button>

                      <NeoButton
                        color="white"
                        className="w-full justify-center"
                        onClick={() => {
                          setIsComplete(false);
                          setDisplayTracks(originalTracks);
                          setHarshTracks([]);
                          setRecommendations([]);
                          setHasFetchedRecommendations(false);
                          setFlowResult(null);
                          setError(null);
                          setActiveSequenceTab('optimized');
                        }}
                      >
                        Reset and Try Again
                      </NeoButton>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Active Tab Content ONLY */}
              <div className="lg:col-span-7 space-y-6">
                {/* Engine metrics + the real energy curve for this sequence */}
                {isComplete && flowResult && activeSequenceTab === 'optimized' && (
                  <>
                    <FlowStatsPanel result={flowResult} />
                    <FlowEnergyChart
                      optimized={displayTracks}
                      original={originalTracks}
                      engineLabel={flowResult.label}
                    />
                  </>
                )}

                {/* Main Track List Container (Visible ONLY when chaotic or optimized tab is active, or before completion) */}
                {(activeSequenceTab === 'optimized' || activeSequenceTab === 'chaotic' || !isComplete) && (
                  <div className="bg-white neo-border border-black rounded-3xl p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-4">
                      <h2 className="text-xl font-black uppercase flex items-center gap-2">
                        {isComplete ? (
                          activeSequenceTab === 'chaotic' ? (
                            <>
                              <span className="bg-brand-orange text-white text-xs px-2.5 py-1 rounded-full neo-border-xs border-black">1. Chaotic</span>
                              <span>Original Sequence (Unsorted)</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 text-brand-yellow fill-current" />
                              <span>2. Optimized Sequence</span>
                            </>
                          )
                        ) : (
                          'Current Sequence'
                        )}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-black text-white px-2 py-1 rounded-md">
                          {activeSequenceTab === 'chaotic' ? originalTracks.length : displayTracks.length} Tracks
                        </span>
                        {isComplete && (
                          <motion.button
                            whileHover={{ scale: 1.08, y: -2 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={handleDownloadCSV}
                            title="Download sequence & recommendations as CSV"
                            className="bg-brand-yellow neo-border-xs border-black px-3 py-1 rounded-md text-xs font-black uppercase font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 text-black cursor-pointer group"
                          >
                            <motion.div animate={{ y: [0, -1.5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                              <Download className="w-3.5 h-3.5 text-black group-hover:scale-110 transition-transform" />
                            </motion.div>
                            <span>CSV</span>
                          </motion.button>
                        )}
                      </div>
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

                      <div
                        className={cn(
                          'transition-all duration-1000',
                          isGenerating && 'blur-[6px] opacity-40 grayscale-[30%] pointer-events-none'
                        )}
                      >
                        <TrackList
                          tracks={activeSequenceTab === 'chaotic' ? originalTracks : displayTracks}
                          variant={activeSequenceTab === 'chaotic' ? 'chaotic' : 'optimized'}
                          onPreview={handleOpenPreview}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Related Song Recommendations ("Next Up / Vibe Extensions") - Visible ONLY when recommendations tab is active */}
                {isComplete && activeSequenceTab === 'recommendations' && (
                  <div className="bg-[#FFFDE8] neo-border border-black rounded-3xl p-6 relative">
                    <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
                      <div>
                        <h3 className="text-lg font-black uppercase text-black flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-brand-orange fill-current" />
                          3. Recommended Next Up (Vibe Extensions)
                        </h3>
                        <p className="font-mono text-xs font-bold text-slate-600 mt-0.5">
                          Hand-picked songs related to your playlist vibe. Click &quot;Add to Flow&quot; to append or download CSV.
                        </p>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.06, y: -2 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={handleDownloadCSV}
                        title="Download full sequence + recommendations as CSV"
                        className="bg-white neo-border-xs border-black px-3 py-1.5 rounded-lg text-xs font-black uppercase font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-50 transition-all flex items-center gap-1.5 shrink-0 text-black cursor-pointer group"
                      >
                        <motion.div animate={{ y: [0, -1.5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
                          <Download className="w-3.5 h-3.5 text-brand-pink group-hover:scale-110 transition-transform fill-current" />
                        </motion.div>
                        <span>Download CSV</span>
                      </motion.button>
                    </div>

                    {isLoadingRecommendations ? (
                      <div className="flex items-center justify-center py-8 gap-3 font-mono text-xs font-black">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-pink" />
                        Analyzing vibe continuation...
                      </div>
                    ) : recommendations.length === 0 ? (
                      <div className="text-center py-6 font-mono text-xs text-slate-500 font-bold space-y-3">
                        <p>No additional recommendations found.</p>
                        <NeoButton color="white" size="sm" onClick={fetchRecommendations}>
                          Try Again
                        </NeoButton>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {recommendations.map((rec) => (
                          <div
                            key={rec.videoId}
                            className="bg-white neo-border-sm p-3 rounded-2xl flex flex-col justify-between gap-3 text-xs shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h4 className="font-black truncate text-xs text-black leading-tight flex-1" title={decodeHtmlEntities(rec.title)}>
                                  {decodeHtmlEntities(rec.title)}
                                </h4>
                                <span className="bg-brand-yellow font-mono font-black text-[9px] px-1.5 py-0.5 rounded border border-black shrink-0">
                                  {rec.estimatedBpm} BPM
                                </span>
                              </div>
                              <p className="font-mono text-[10px] text-slate-500 font-bold truncate mb-2">
                                {decodeHtmlEntities(rec.artist)}
                              </p>
                              <p className="font-mono text-[9.5px] text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200 line-clamp-2 leading-relaxed">
                                &quot;{decodeHtmlEntities(rec.vibeReview)}&quot;
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-dashed border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleOpenPreview(rec)}
                                className="flex-1 bg-white neo-border-xs text-black py-1.5 px-2 rounded-lg font-mono font-bold text-[10px] uppercase flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-brand-pink" />
                                Preview 15s
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAddRecommendation(rec)}
                                className="flex-1 bg-brand-yellow neo-border-xs text-black py-1.5 px-2 rounded-lg font-mono font-black text-[10px] uppercase flex items-center justify-center gap-1 hover:bg-brand-yellow/80 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add to Flow
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Harsh Tracks Excluded - Visible ONLY when harsh tab is active */}
                {isComplete && activeSequenceTab === 'harsh' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#FFE5E5] border-3 border-red-500 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-black uppercase text-red-700">
                        4. Excluded by {flowResult?.label ?? 'the engine'}
                      </h2>
                    </div>

                    {harshTracks.length === 0 ? (
                      <p className="font-mono text-xs font-bold text-slate-600 bg-white p-4 rounded-xl border border-red-200">
                        ✨ 0 Harsh Transitions Found! All tracks fit the {flowModes.find((m) => m.id === selectedMode)?.title || 'Selected'} vibe profile naturally.
                      </p>
                    ) : (
                      <>
                        <p className="font-mono text-xs font-bold text-red-600 mb-4">
                          These tracks completely ruined the {flowModes.find((m) => m.id === selectedMode)?.title} aesthetic. We removed them to save your flow.
                        </p>

                        <div data-lenis-prevent="true" className="max-h-[30vh] overflow-y-auto pr-2 overscroll-contain">
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {harshTracks.map((track) => (
                              <li key={track.videoId} className="bg-white border-2 border-red-500 p-2.5 rounded-xl flex flex-col gap-1">
                                <div className="min-w-0">
                                  <h4 className="font-black text-[11px] truncate">{decodeHtmlEntities(track.title)}</h4>
                                  <p className="font-mono text-[9px] text-slate-500 truncate">{decodeHtmlEntities(track.artist)}</p>
                                </div>
                                {track.reason && (
                                  <p className="font-mono text-[9px] text-red-700 bg-red-50 border border-red-200 rounded-md px-1.5 py-1 leading-snug">
                                    {track.reason}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 15s AUDIO PREVIEW & AI REVIEW MODAL */}
      <AudioPreviewModal
        track={previewTrack}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

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
                      <p className="font-mono text-xs font-bold text-slate-500">Save to YouTube Music or download as CSV</p>
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
                      <div className="bg-red-50 border-2 border-red-500 text-red-700 p-4 rounded-2xl font-mono text-xs font-bold space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                          <span className="font-black">{exportError}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Export limit reached (3 playlists/day). You can download your playlist sequence directly as a CSV file to import into any music platform!
                        </p>
                        <button
                          onClick={handleDownloadCSV}
                          className="w-full bg-brand-yellow neo-border border-black text-black font-black uppercase py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                        >
                          <Download className="w-4 h-4" />
                          DOWNLOAD CSV NOW
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <NeoButton
                      color="white"
                      className="w-full sm:flex-1 justify-center"
                      onClick={handleDownloadCSV}
                      disabled={isExporting}
                    >
                      <Download className="w-4 h-4 mr-1 text-brand-pink" />
                      Download CSV
                    </NeoButton>

                    <NeoButton
                      color="yellow"
                      className="w-full sm:flex-1 justify-center"
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
                      &quot;{exportTitle}&quot; was successfully created on YouTube Music.
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

                    <button
                      onClick={handleDownloadCSV}
                      className="w-full bg-white neo-border border-black font-black uppercase py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors text-black"
                    >
                      <Download className="w-4 h-4 text-brand-pink" />
                      Download Backup CSV
                    </button>

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
