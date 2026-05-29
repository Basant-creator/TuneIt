'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface FlowModeCardProps {
  emoji: string;
  title: string;
  description: string;
  color?: 'pink' | 'blue' | 'yellow' | 'orange' | 'white';
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FlowModeCard({
  emoji,
  title,
  description,
  color = 'blue',
  selected = false,
  onClick,
  className,
}: FlowModeCardProps) {
  const colorMap = {
    pink: 'bg-brand-pink text-white border-black',
    blue: 'bg-brand-blue text-black border-black',
    yellow: 'bg-brand-yellow text-black border-black',
    orange: 'bg-brand-orange text-white border-black',
    white: 'bg-white text-black border-black',
  };

  const selectedOverlayMap = {
    pink: 'bg-brand-yellow border-brand-pink text-black',
    blue: 'bg-brand-pink border-brand-blue text-white',
    yellow: 'bg-brand-orange border-brand-yellow text-white',
    orange: 'bg-brand-yellow border-brand-orange text-black',
    white: 'bg-black border-white text-white',
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ y: 2, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
      className={cn(
        'neo-border rounded-2xl p-6 cursor-pointer select-none relative h-full flex flex-col',
        selected ? 'neo-shadow-lg ring-4 ring-black translate-y-[-6px]' : 'neo-shadow',
        selected ? selectedOverlayMap[color] : colorMap[color],
        className
      )}
    >
      {/* Decorative Active Badge */}
      {selected && (
        <span className="absolute -top-3.5 -right-3.5 neo-border px-2.5 py-0.5 text-[9px] font-black uppercase bg-white text-black rounded-lg shadow-sm">
          Active Flow ⚡
        </span>
      )}

      {/* Emoji Badge */}
      <div className="w-14 h-14 rounded-xl neo-border bg-white flex items-center justify-center text-3xl shadow-sm mb-4 shrink-0 transform -rotate-6">
        <span className="transform rotate-6 inline-block">{emoji}</span>
      </div>

      {/* Title */}
      <h4 className="text-xl font-black mb-2 tracking-tight uppercase">
        {title}
      </h4>

      {/* Description */}
      <p
        className={cn(
          'text-xs font-medium leading-relaxed font-mono flex-1',
          selected ? 'opacity-90' : 'text-slate-700 dark:text-slate-800'
        )}
      >
        {description}
      </p>
    </motion.div>
  );
}
