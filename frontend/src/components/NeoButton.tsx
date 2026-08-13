'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface NeoButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  children: React.ReactNode;
  color?: 'pink' | 'blue' | 'yellow' | 'orange' | 'white';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  noShadow?: boolean;
}

export function NeoButton({
  children,
  color = 'yellow',
  size = 'md',
  className,
  noShadow = false,
  ...props
}: NeoButtonProps) {
  const colorMap = {
    pink: 'bg-brand-pink text-white',
    blue: 'bg-brand-blue text-black',
    yellow: 'bg-brand-yellow text-black',
    orange: 'bg-brand-orange text-white',
    white: 'bg-white text-black',
  };

  const sizeMap = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg',
    md: 'px-6 py-3 text-sm font-bold rounded-xl',
    lg: 'px-8 py-4.5 text-base font-extrabold rounded-2xl tracking-wider',
  };

  return (
    <motion.button
      whileHover={{ y: -2, x: -2 }}
      whileTap={{ y: 1, x: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={cn(
        'neo-border font-mono relative cursor-pointer select-none inline-flex items-center justify-center gap-2 text-center transition-colors uppercase duration-100',
        colorMap[color],
        sizeMap[size],
        !noShadow && 'neo-shadow-sm hover:shadow-[4.5px_4.5px_0px_0px_#000000] active:shadow-[2px_2px_0px_0px_#000000]',
        props.disabled && 'opacity-50 pointer-events-none shadow-none translate-x-0 translate-y-0',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
