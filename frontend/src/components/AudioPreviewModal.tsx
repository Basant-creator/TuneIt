'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, Volume2, Sparkles, Loader2, Disc, ExternalLink } from 'lucide-react';
import { NeoButton } from './NeoButton';
import { decodeHtmlEntities } from '@/utils/decodeHtml';
import { getAudioPreviewUrl } from '@/utils/audioPreview';

interface AudioPreviewTrack {
  videoId: string;
  title: string;
  artist: string;
  vibeReview?: string;
  estimatedBpm?: number;
  intensityScore?: number;
}

interface AudioPreviewModalProps {
  track: AudioPreviewTrack | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AudioPreviewModal({ track, isOpen, onClose }: AudioPreviewModalProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(15);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = React.useState(false);
  const [audioError, setAudioError] = React.useState(false);
  const [activeTrackId, setActiveTrackId] = React.useState<string | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Sync state when track changes
  if (track && track.videoId !== activeTrackId) {
    setActiveTrackId(track.videoId);
    setIsLoadingAudio(true);
    setAudioError(false);
    setIsPlaying(false);
    setTimeLeft(15);
  }

  // Fetch audio preview URL whenever modal opens or activeTrackId changes
  React.useEffect(() => {
    let isMounted = true;
    const currentAudio = audioRef.current;

    if (isOpen && track) {
      getAudioPreviewUrl(track.title, track.artist)
        .then((url) => {
          if (!isMounted) return;
          if (url) {
            setPreviewUrl(url);
            setIsPlaying(true);
          } else {
            setAudioError(true);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingAudio(false);
        });
    }

    return () => {
      isMounted = false;
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [isOpen, track]);

  // Synchronize HTML5 audio element play/pause state
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn('HTML5 Audio playback interrupted:', err);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, previewUrl]);

  // 15-second snippet countdown timer
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (audioRef.current) audioRef.current.pause();
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, isPlaying, timeLeft]);

  if (!isOpen || !track) return null;

  const decodedTitle = decodeHtmlEntities(track.title);
  const decodedArtist = decodeHtmlEntities(track.artist);
  const progressPercent = ((15 - timeLeft) / 15) * 100;

  const handleTogglePlay = () => {
    if (timeLeft === 0) {
      handleReplay();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReplay = () => {
    setTimeLeft(15);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  const handleCloseModal = () => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
        {/* Hidden HTML5 Audio Element for Pure Audio Snippet Playback */}
        {previewUrl && (
          <audio
            ref={audioRef}
            src={previewUrl}
            preload="auto"
            onEnded={() => setIsPlaying(false)}
          />
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white neo-border border-black rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 text-slate-400 hover:text-black p-2 rounded-full transition-colors z-20"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-brand-pink text-white neo-border-xs px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Volume2 className="w-4 h-4 animate-pulse" />
              15s Pure Audio Snippet
            </span>
          </div>

          {/* Song Details */}
          <div className="mb-4">
            <h3 className="text-xl font-black uppercase text-black line-clamp-1 mb-0.5" title={decodedTitle}>
              {decodedTitle}
            </h3>
            <p className="font-mono text-xs font-bold text-slate-500 truncate">
              {decodedArtist}
            </p>
          </div>

          {/* Audio Player Showcase Box (Pure Audio - No Video) */}
          <div className="w-full h-40 rounded-2xl neo-border mb-4 bg-[#111] relative overflow-hidden flex flex-col items-center justify-center p-4 text-white shadow-inner">
            {/* Background Animated Sound Wave Bars when Playing */}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-around px-8 opacity-25 pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [12, 48, 8, 64, 16] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.07,
                      ease: 'easeInOut',
                    }}
                    className="w-1.5 bg-brand-yellow rounded-full"
                  />
                ))}
              </div>
            )}

            {isLoadingAudio ? (
              <div className="flex flex-col items-center justify-center gap-2 font-mono">
                <Loader2 className="w-8 h-8 animate-spin text-brand-yellow" />
                <span className="text-xs font-black uppercase tracking-wide">Loading Audio Stream...</span>
              </div>
            ) : audioError || !previewUrl ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center p-2 font-mono">
                <Disc className="w-8 h-8 text-slate-500" />
                <span className="text-xs font-black uppercase text-slate-300">Audio Preview Unavailable</span>
                <a
                  href={`https://music.youtube.com/watch?v=${track.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-brand-yellow font-bold underline mt-1"
                >
                  Listen on YouTube Music <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 z-10 font-mono">
                {/* Spinning Vinyl Record Icon */}
                <motion.div
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full bg-slate-950 border-4 border-slate-800 neo-shadow-sm flex items-center justify-center relative cursor-pointer"
                  onClick={handleTogglePlay}
                >
                  <div className="w-5 h-5 rounded-full bg-brand-pink border border-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </motion.div>

                <span className="text-[11px] font-black uppercase tracking-wider text-brand-yellow">
                  {isPlaying ? '▶ Pure Audio Playing (15s)' : '⏸ Audio Paused'}
                </span>
              </div>
            )}
          </div>

          {/* AI 10-15 Word Mini Song Review Box */}
          <div className="bg-[#FFFDF0] neo-border border-black p-3 rounded-2xl mb-4 relative">
            <div className="flex items-center gap-1.5 mb-1 text-brand-orange">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span className="text-[9.5px] font-black uppercase tracking-wider font-mono">
                AI 15-Word Song Review
              </span>
            </div>
            <p className="font-bold text-xs leading-relaxed text-slate-800 font-mono">
              &quot;{track.vibeReview || 'Smooth harmonic flow, vibrant synth pads, and a driving 122 BPM rhythmic progression.'}&quot;
            </p>
          </div>

          {/* 15-Second Progress Bar */}
          <div className="mb-5 space-y-1">
            <div className="flex justify-between text-[11px] font-mono font-black uppercase text-slate-600">
              <span>{isPlaying ? '15s Snippet Playing' : 'Snippet Paused'}</span>
              <span className="text-brand-pink font-extrabold">{timeLeft}s</span>
            </div>
            <div className="w-full h-2.5 neo-border-sm rounded-lg bg-slate-100 overflow-hidden relative">
              <motion.div
                className="h-full bg-brand-yellow border-r-2 border-black"
                style={{ width: `${progressPercent}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-3">
            <NeoButton
              color={isPlaying ? 'orange' : 'yellow'}
              className="flex-1 justify-center py-2.5 text-xs font-black"
              onClick={handleTogglePlay}
              disabled={isLoadingAudio || (!previewUrl && !audioError)}
            >
              {isPlaying ? (
                <span className="flex items-center gap-2">
                  <Pause className="w-4 h-4 fill-current" /> Pause
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4 fill-current" /> Play Audio
                </span>
              )}
            </NeoButton>

            <NeoButton
              color="white"
              className="justify-center px-4 py-2.5 text-xs"
              onClick={handleReplay}
              disabled={isLoadingAudio || !previewUrl}
              title="Replay 15s Snippet"
            >
              <RotateCcw className="w-4 h-4" />
            </NeoButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
