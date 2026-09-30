'use client';

import * as React from 'react';
import { MotionConfig } from 'framer-motion';
import { validateEnv } from '@/lib/env';
import { SmoothScroll } from './SmoothScroll';

// Warn once, on the server, if a production build is misconfigured.
if (typeof window === 'undefined') {
  validateEnv();
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // reducedMotion="user" makes every framer-motion animation honour the OS
    // "reduce motion" setting. Before this only Lenis did, so hundreds of
    // springs, wobbles and infinite bobs ran regardless.
    <MotionConfig reducedMotion="user">
      <SmoothScroll>{children}</SmoothScroll>
    </MotionConfig>
  );
}
