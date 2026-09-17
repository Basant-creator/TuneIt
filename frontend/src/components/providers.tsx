'use client';

import * as React from 'react';
import { validateEnv } from '@/lib/env';
import { SmoothScroll } from './SmoothScroll';

// Warn once, on the server, if a production build is misconfigured.
if (typeof window === 'undefined') {
  validateEnv();
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SmoothScroll>{children}</SmoothScroll>;
}
