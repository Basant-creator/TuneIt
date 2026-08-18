'use client';

import * as React from 'react';
import { Music } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TrackImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackIconClassName?: string;
  fallbackBgColor?: string;
}

export function TrackImage({
  src,
  alt,
  className,
  containerClassName,
  fallbackIconClassName,
  fallbackBgColor = 'bg-brand-orange',
}: TrackImageProps) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);

  const showFallback = !src || failedSrc === src;

  return (
    <div
      className={cn(
        'relative overflow-hidden shrink-0 select-none bg-slate-200 flex items-center justify-center',
        containerClassName
      )}
    >
      {/* Background Shimmer while image is downloading */}
      {!showFallback && (
        <div className="absolute inset-0 shimmer-placeholder z-0 pointer-events-none" />
      )}

      {/* Actual Track Image */}
      {!showFallback ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className={cn(
            'w-full h-full object-cover relative z-10 block',
            className
          )}
        />
      ) : (
        /* Reliable Neo-Brutalist Music Icon Fallback */
        <div
          className={cn(
            'w-full h-full flex items-center justify-center relative z-10 text-white',
            fallbackBgColor,
            className
          )}
        >
          <Music
            className={cn(
              'w-1/2 h-1/2 text-black fill-current stroke-[2.5px] opacity-80',
              fallbackIconClassName
            )}
          />
        </div>
      )}
    </div>
  );
}
