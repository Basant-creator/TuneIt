'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Music2 } from 'lucide-react';
import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';
import { TextLogo } from '@/components/TextLogo';
import { env } from '@/lib/env';

interface UserProfile {
  display_name?: string;
  images?: Array<{ url: string }>;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  images?: Array<{ url: string }>;
  tracks?: { total: number };
}

export default function PlaylistsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const meRes = await fetch(`${env.apiUrl}/api/me`);
        if (!meRes.ok) throw new Error('Unauthenticated');
        const profile = await meRes.json();
        if (isMounted) setUserProfile(profile);

        const playlistsRes = await fetch(`${env.apiUrl}/api/playlists`);
        if (!playlistsRes.ok) throw new Error('Failed to fetch playlists');
        const data = await playlistsRes.json();

        if (isMounted && data?.items) {
          setPlaylists(data.items);
        }
      } catch (err) {
        console.error('[PlaylistsPage Error]', err);
        if (isMounted) router.push('/');
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
      <header className="w-full py-5 px-6 md:px-12 border-b-3 border-black bg-white flex items-center justify-between sticky top-0 z-50 select-none">
        <div className="flex items-center cursor-pointer" onClick={() => router.push('/')}>
          <TextLogo />
        </div>

        <div className="flex items-center gap-3">
          {userProfile && (
            <div className="flex items-center gap-2 bg-[#F8FFE5] neo-border px-3.5 py-1.5 rounded-xl border-black select-none">
              {userProfile.images?.[0]?.url && (
                <img
                  src={userProfile.images[0].url}
                  alt={userProfile.display_name || 'User'}
                  className="w-6 h-6 rounded-full border-2 border-black"
                />
              )}
              <span className="font-mono text-xs font-black text-black hidden sm:inline">
                {userProfile.display_name}
              </span>
            </div>
          )}
        </div>
      </header>

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
                className="bg-white neo-border border-black rounded-2xl overflow-hidden hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col group cursor-pointer"
                onClick={() => router.push(`/playlists/${playlist.id}`)}
              >
                <div className="w-full aspect-square bg-slate-100 border-b-3 border-black relative overflow-hidden">
                  {playlist.images && playlist.images.length > 0 ? (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-orange">
                      <Music2 className="w-12 h-12 text-black opacity-30" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white neo-border border-black px-2 py-1 rounded-lg text-xs font-black font-mono">
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
