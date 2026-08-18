'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TextLogo } from '@/components/TextLogo';
import { NeoButton } from '@/components/NeoButton';
import { TrackImage } from '@/components/TrackImage';
import { cn } from '@/utils/cn';
import { env } from '@/lib/env';

interface UserProfile {
  display_name?: string;
  images?: Array<{ url: string }>;
}

interface HeaderProps {
  userProfile?: UserProfile | null;
  showNavLinks?: boolean;
}

export function Header({
  userProfile,
  showNavLinks = true,
}: HeaderProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 30);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full flex justify-center select-none pointer-events-none p-2 sm:p-3">
      <div
        className={cn(
          'pointer-events-auto flex items-center justify-between w-full transition-all duration-300 ease-out select-none gpu-layer',
          isScrolled
            ? 'max-w-4xl bg-white/95 backdrop-blur-md border-2 border-black rounded-full px-5 md:px-8 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)]'
            : 'max-w-full bg-white border-b-2 border-black rounded-none px-6 md:px-12 py-4 shadow-none -mt-2 -mx-2 sm:-mt-3 sm:-mx-3 w-[calc(100%+1rem)] sm:w-[calc(100%+1.5rem)]'
        )}
      >
        {/* Logo */}
        <div
          className="flex items-center cursor-pointer hover:scale-105 transition-transform shrink-0"
          onClick={() => router.push('/')}
        >
          <TextLogo />
        </div>

        {/* Navigation Links */}
        {showNavLinks && (
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 font-mono font-black text-xs lg:text-sm uppercase tracking-wide shrink-0">
            <a
              href="#transformation"
              className="hover:text-brand-pink transition-colors cursor-pointer py-1 px-2.5 rounded-full hover:bg-slate-100 whitespace-nowrap"
            >
              Flow Fixer
            </a>
            <a
              href="#modes"
              className="hover:text-brand-blue transition-colors cursor-pointer py-1 px-2.5 rounded-full hover:bg-slate-100 whitespace-nowrap"
            >
              Modes
            </a>
            <a
              href="#how-it-works"
              className="hover:text-brand-orange transition-colors cursor-pointer py-1 px-2.5 rounded-full hover:bg-slate-100 whitespace-nowrap"
            >
              How It Works
            </a>
          </nav>
        )}

        {/* User Profile / Action */}
        <div className="flex items-center gap-3 shrink-0">
          {userProfile ? (
            <div className="flex items-center gap-2 bg-[#F8FFE5] border-2 border-black px-3 py-1.5 rounded-full select-none shadow-none shrink-0">
              {userProfile.images?.[0]?.url && (
                <TrackImage
                  src={userProfile.images[0].url}
                  alt={userProfile.display_name || 'User'}
                  containerClassName="w-5 h-5 rounded-full border border-black overflow-hidden"
                />
              )}
              <span className="font-mono text-xs font-black text-black max-w-[120px] truncate">
                {userProfile.display_name || 'YouTube Music'}
              </span>
            </div>
          ) : (
            <a href={`${env.apiUrl}/auth/login`}>
              <NeoButton color="yellow" size="sm" className="hidden sm:inline-flex rounded-full">
                Connect YouTube Music
              </NeoButton>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

