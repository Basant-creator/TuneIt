'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface StickerProps {
  children: React.ReactNode;
  color?: 'pink' | 'blue' | 'yellow' | 'orange' | 'white' | 'dark';
  rotation?: number;
  className?: string;
  pin?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Sticker({
  children,
  color = 'yellow',
  rotation,
  className,
  pin = false,
  size = 'sm',
}: StickerProps) {
  const [randomTilt] = React.useState(() =>
    rotation !== undefined
      ? rotation
      : typeof window !== 'undefined'
      ? (Math.random() - 0.5) * 8
      : 0
  );

  const tilt = rotation !== undefined ? rotation : randomTilt;

  const colorMap = {
    pink: 'bg-brand-pink text-white border-black',
    blue: 'bg-brand-blue text-black border-black',
    yellow: 'bg-brand-yellow text-black border-black',
    orange: 'bg-brand-orange text-white border-black',
    white: 'bg-white text-black border-black',
    dark: 'bg-black text-white border-white',
  };

  const sizeMap = {
    sm: 'px-2.5 py-1 text-xs md:text-sm font-black tracking-wide',
    md: 'px-4 py-1.5 text-sm md:text-base font-black tracking-wide',
    lg: 'px-5 py-2.5 text-lg md:text-2xl font-bold tracking-wider',
  };

  return (
    <motion.div
      style={{ rotate: tilt }}
      whileHover={{ 
        scale: 1.08, 
        rotate: tilt + (tilt > 0 ? 4 : -4),
      }}
      transition={{ type: 'spring', stiffness: 550, damping: 22 }}
      className={cn(
        'neo-border neo-shadow-sm text-center rounded-lg inline-block relative font-handwritten select-none z-10 cursor-default gpu-layer',
        colorMap[color],
        sizeMap[size],
        className
      )}
    >
      {/* Decorative pushpin or tape */}
      {pin && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-600 border-2 border-black shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />
        </div>
      )}
      
      <span className="inline-block">
        {children}
      </span>
    </motion.div>
  );
}
