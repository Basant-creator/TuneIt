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
  // Generate a random slight rotation if none is provided to make it look organic
  const [randomTilt, setRandomTilt] = React.useState(0);
  const [randomDelay, setRandomDelay] = React.useState(0);
  
  React.useEffect(() => {
    setRandomDelay(Math.random() * 2);
    if (rotation === undefined) {
      const timer = setTimeout(() => {
        setRandomTilt((Math.random() - 0.5) * 8); // random angle between -4deg and +4deg
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [rotation]);

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

  const wobblyAnimation = {
    y: [0, -6, 2, -5, 3, -3, 0],
    rotate: [tilt, tilt - 3, tilt + 4, tilt - 2, tilt + 3, tilt - 3, tilt],
  };

  const wobblyTransition = {
    duration: 5,
    repeat: Infinity,
    repeatType: 'mirror' as const,
    ease: 'easeInOut' as const,
    delay: randomDelay,
  };

  return (
    <motion.div
      style={{ rotate: tilt }}
      animate={wobblyAnimation}
      transition={wobblyTransition}
      whileHover={{ 
        scale: 1.1, 
        rotate: tilt + (tilt > 0 ? 5 : -5),
        transition: { duration: 0.15 } 
      }}
      className={cn(
        'neo-border neo-shadow-sm text-center rounded-lg inline-block relative font-handwritten select-none z-10 cursor-default',
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
