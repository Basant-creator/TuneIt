'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { validateEnv } from '@/lib/env';
import { SmoothScroll } from './SmoothScroll';

// Proactively warn about missing environment variables in server console
if (typeof window === 'undefined') {
  try {
    validateEnv();
  } catch (error) {
    if (error instanceof Error) {
      console.error('\x1b[31m%s\x1b[0m', error.message);
    }
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Run validation on local mount for dev environments
    if (process.env.NODE_ENV !== 'production') {
      try {
        validateEnv();
      } catch (error) {
        if (error instanceof Error) {
          console.warn('Environment Warning:', error.message);
        }
      }
    }
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <SmoothScroll>{children}</SmoothScroll>
    </NextThemesProvider>
  );
}

