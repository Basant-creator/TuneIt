'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Settings2 } from 'lucide-react';
import { NeoButton } from '@/components/NeoButton';
import { Sticker } from '@/components/Sticker';

export default function PlaylistModifierPage() {
  const router = useRouter();
  const params = useParams();
  const playlistId = params.id as string;
  
  const [loading, setLoading] = React.useState(true);
  const [playlist, setPlaylist] = React.useState<any>(null);

  React.useEffect(() => {
    // In a real implementation, we would fetch the specific playlist details here
    // For now, we simulate a loading state
    const timer = setTimeout(() => {
      setPlaylist({
        id: playlistId,
        name: 'Selected Playlist',
        tracks: { total: 42 }
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [playlistId]);

  return (
    <div className="min-h-screen bg-[#F8FFE5] text-black">
      {/* HEADER */}
      <header className="w-full py-5 px-6 md:px-12 border-b-3 border-black bg-white flex items-center sticky top-0 z-50 select-none">
        <NeoButton color="white" size="sm" onClick={() => router.push('/playlists')}>
          <ArrowLeft className="w-4 h-4 mr-2 inline" />
          Back to Playlists
        </NeoButton>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto py-12 px-6 text-center flex flex-col items-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 mt-20">
            <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
            <p className="font-mono font-black uppercase text-sm">Loading playlist data...</p>
          </div>
        ) : (
          <div className="mt-12 space-y-8 flex flex-col items-center relative">
            <div className="absolute -top-12 -left-12">
              <Sticker color="pink" rotation={-10} size="md">
                🛠️ Under Construction!
              </Sticker>
            </div>
            
            <div className="w-24 h-24 bg-brand-yellow neo-border border-black rounded-3xl flex items-center justify-center transform rotate-3 mb-4">
              <Settings2 className="w-12 h-12 text-black" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
              Playlist Modifier
            </h1>
            
            <p className="font-mono text-sm md:text-base font-bold text-slate-700 max-w-lg leading-relaxed">
              You selected playlist ID: <span className="bg-black text-white px-2 py-0.5 rounded-md">{playlistId}</span>. 
              This is a placeholder page where the actual drag-and-drop modification and flow curve applying tools will go.
            </p>

            <div className="bg-white neo-border border-black p-8 rounded-2xl w-full max-w-2xl mt-8">
              <h2 className="text-2xl font-black uppercase mb-4 border-b-3 border-black pb-2 inline-block">Next Steps:</h2>
              <ul className="text-left font-mono text-sm font-medium space-y-3 mt-4">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-pink border border-black inline-block" />
                  Fetch actual tracks for this playlist
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-orange border border-black inline-block" />
                  Implement track drag-and-drop reordering
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-blue border border-black inline-block" />
                  Apply Flow curves based on energy & BPM
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
