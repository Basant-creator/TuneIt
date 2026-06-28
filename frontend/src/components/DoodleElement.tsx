'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

type DoodleType = 'arrow' | 'squiggle' | 'musicNote' | 'sparkle' | 'star' | 'wave';

interface DoodleElementProps {
  type: DoodleType;
  className?: string;
  color?: string;
  animate?: boolean;
}

export function DoodleElement({
  type,
  className,
  color = 'currentColor',
  animate = true,
}: DoodleElementProps) {
  const [randomDelay, setRandomDelay] = React.useState(0);

  React.useEffect(() => {
    setRandomDelay(Math.random() * 3);
  }, []);
  // SVG paths for hand-drawn music and Brutalist elements
  const svgs: Record<DoodleType, React.ReactNode> = {
    arrow: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M10 80 C 40 85, 75 60, 80 20 M 80 20 L 60 22 M 80 20 L 78 40"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    squiggle: (
      <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M10 20 Q 30 5, 50 20 T 90 20 T 110 20"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    musicNote: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M25 65 A 8 8 0 1 1 15 55 A 8 8 0 0 1 25 65 Z"
          fill={color}
          stroke="#000"
          strokeWidth="3"
        />
        <path
          d="M65 55 A 8 8 0 1 1 55 45 A 8 8 0 0 1 65 55 Z"
          fill={color}
          stroke="#000"
          strokeWidth="3"
        />
        <path
          d="M25 60 V 20 L 65 10 V 50"
          stroke="#000"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25 25 L 65 15"
          stroke="#000"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    ),
    sparkle: (
      <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M30 5 C 30 20, 20 30, 5 30 C 20 30, 30 40, 30 55 C 30 40, 40 30, 55 30 C 40 30, 30 20, 30 5 Z"
          fill={color}
          stroke="#000"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M40 5 L 51 28 L 76 28 L 56 43 L 63 67 L 40 52 L 17 67 L 24 43 L 4 28 L 29 28 Z"
          fill={color}
          stroke="#000"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
    ),
    wave: (
      <svg viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M5 15 C 20 35, 30 -5, 50 15 C 70 35, 80 -5, 95 15"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  const animationProps = animate
    ? {
        animate: {
          x: [0, 6, -4, 5, -5, 3, 0],
          y: [0, -14, 5, -10, 8, -5, 0],
          rotate: [0, -6, 8, -4, 6, -3, 0],
          scale: [1, 1.06, 0.94, 1.03, 0.97, 1.02, 1],
        },
        transition: {
          duration: 6,
          repeat: Infinity,
          repeatType: 'mirror' as const,
          ease: 'easeInOut' as const,
          delay: randomDelay,
        },
      }
    : {};

  return (
    <motion.div
      {...animationProps}
      whileHover={animate ? { scale: 1.15, rotate: 10 } : {}}
      className={cn('inline-block select-none pointer-events-auto', className)}
    >
      {svgs[type]}
    </motion.div>
  );
}
