'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, Music2 } from 'lucide-react';
import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';
import { Header } from '@/components/Header';
import { TrackImage } from '@/components/TrackImage';
import { api, ApiError } from '@/services/api';
import type { Playlist, UserProfile } from '@/types/flow';

export default function PlaylistsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // Profile and playlists are independent; fetch them together.
        const [profile, items] = await Promise.all([api.getProfile(), api.getPlaylists()]);
        if (!isMounted) return;
        setUserProfile(profile);
        setPlaylists(items);
      } catch (err) {
        console.error('[PlaylistsPage Error]', err);
        if (!isMounted) return;
        if (err instanceof ApiError && err.isAuthError) {
          setNeedsAuth(true);
          setError('Connect your YouTube Music account to see your playlists.');
        } else {
          setError(
            err instanceof Error ? err.message : 'Something went wrong loading your playlists.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FFE5] text-black">
      {/* HEADER */}
      <Header userProfile={userProfile} showNavLinks={false} />

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto py-12 px-6">
        <div className="mb-10 flex flex-col items-start gap-4">
          <NeoButton color="white" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2 inline" />
            Back to Home
          </NeoButton>
          <div className="relative">
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">
              Your <span className="bg-brand-yellow px-2 border-3 border-black rounded-xl inline-block transform rotate-2">Playlists</span>
            </h1>
            <div className="absolute -top-6 -right-16 hidden md:block">
              <Sticker color="blue" rotation={6} size="sm">
                Pick one!
              </Sticker>
            </div>
          </div>
          <p className="font-mono font-bold text-slate-700 max-w-xl text-sm">
            Select a playlist below to start rearranging its flow. We&apos;ve fetched these directly from your YouTube account.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-brand-pink" />
            <p className="font-mono font-black uppercase text-sm">Loading your vibes...</p>
          </div>
        ) : error ? (
          <div className="bg-white neo-border border-black p-10 sm:p-12 rounded-3xl text-center flex flex-col items-center justify-center max-w-xl mx-auto">
            <AlertCircle className="w-14 h-14 text-brand-orange mb-4" />
            <h3 className="text-2xl font-black uppercase mb-2">
              {needsAuth ? 'Not Connected' : 'Something Broke'}
            </h3>
            <p className="font-mono text-sm text-slate-600 mb-6 max-w-sm font-bold">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              {needsAuth ? (
                <a href={api.loginUrl()}>
                  <NeoButton color="yellow">Connect YouTube Music</NeoButton>
                </a>
              ) : (
                <NeoButton color="yellow" onClick={() => window.location.reload()}>
                  Try Again
                </NeoButton>
              )}
              <NeoButton color="white" onClick={() => router.push('/')}>
                Back to Home
              </NeoButton>
            </div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="bg-white neo-border border-black p-12 rounded-3xl text-center flex flex-col items-center justify-center">
            <Music2 className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-2xl font-black uppercase mb-2">No Playlists Found</h3>
            <p className="font-mono text-sm text-slate-600 mb-6 max-w-sm">
              We couldn&apos;t find any playlists in your YouTube account. Create one on YouTube and come back!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="bg-white neo-border border-black rounded-2xl overflow-hidden hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col group cursor-pointer gpu-layer"
                onClick={() => router.push(`/playlists/${playlist.id}`)}
              >
                <div className="w-full aspect-square bg-slate-100 border-b-3 border-black relative overflow-hidden">
                  <TrackImage
                    src={playlist.images?.[0]?.url}
                    alt={playlist.name}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-white neo-border border-black px-2 py-1 rounded-lg text-xs font-black font-mono z-20">
                    {playlist.tracks?.total || 0} Tracks
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-black text-lg uppercase truncate mb-1" title={playlist.name}>
                    {playlist.name}
                  </h3>
                  <p className="font-mono text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
                    {playlist.description || 'No description provided.'}
                  </p>
                  <NeoButton
                    color="pink"
                    className="w-full text-xs py-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/playlists/${playlist.id}`);
                    }}
                  >
                    Modify & Rearrange
                  </NeoButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
