'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

type NeoColor = 'pink' | 'blue' | 'yellow' | 'orange' | 'white';
type NeoSize = 'sm' | 'md' | 'lg';

interface NeoButtonBaseProps {
  children: React.ReactNode;
  color?: NeoColor;
  size?: NeoSize;
  className?: string;
  noShadow?: boolean;
}

type NeoButtonAsButton = NeoButtonBaseProps &
  Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'color'
  > & { href?: undefined };

/**
 * Passing `href` renders a real anchor styled as a button.
 *
 * Wrapping a <button> in an <a> nests two interactive elements, which is
 * invalid HTML and announces twice to screen readers. The login links did
 * exactly that.
 */
type NeoButtonAsLink = NeoButtonBaseProps &
  Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'color'
  > & { href: string; disabled?: never };

export type NeoButtonProps = NeoButtonAsButton | NeoButtonAsLink;

const COLOR_MAP: Record<NeoColor, string> = {
  pink: 'bg-brand-pink text-white',
  blue: 'bg-brand-blue text-black',
  yellow: 'bg-brand-yellow text-black',
  orange: 'bg-brand-orange text-white',
  white: 'bg-white text-black',
};

const SIZE_MAP: Record<NeoSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg',
  md: 'px-6 py-3 text-sm font-bold rounded-xl',
  lg: 'px-8 py-4.5 text-base font-extrabold rounded-2xl tracking-wider',
};

// The press physics: lift up-left on hover while the hard shadow grows, then
// sink down-right on press while it shrinks — a physical key being pushed.
const HOVER = { y: -2, x: -2 };
const TAP = { y: 1.5, x: 1.5 };
const SPRING = { type: 'spring' as const, stiffness: 600, damping: 25 };

export function NeoButton(props: NeoButtonProps) {
  const { children, color = 'yellow', size = 'md', className, noShadow = false } = props;
  const disabled = 'disabled' in props && props.disabled;

  const classes = cn(
    'neo-border neo-focus font-mono relative cursor-pointer select-none inline-flex items-center justify-center gap-2 text-center transition-colors uppercase duration-150 gpu-layer',
    COLOR_MAP[color],
    SIZE_MAP[size],
    !noShadow &&
      'neo-shadow-sm hover:shadow-[5px_5px_0px_0px_#000000] active:shadow-[1.5px_1.5px_0px_0px_#000000]',
    disabled && 'opacity-50 pointer-events-none shadow-none translate-x-0 translate-y-0',
    className
  );

  if (props.href !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { children: _c, color: _co, size: _s, className: _cl, noShadow: _n, ...anchorProps } = props;
    return (
      <motion.a whileHover={HOVER} whileTap={TAP} transition={SPRING} className={classes} {...anchorProps}>
        {children}
      </motion.a>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { children: _c, color: _co, size: _s, className: _cl, noShadow: _n, ...buttonProps } = props;
  return (
    <motion.button
      type="button"
      whileHover={HOVER}
      whileTap={TAP}
      transition={SPRING}
      className={classes}
      {...buttonProps}
    >
      {children}
    </motion.button>
  );
}
