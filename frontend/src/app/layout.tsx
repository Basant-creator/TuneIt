import type { Metadata, Viewport } from 'next';
import { Special_Gothic_Expanded_One, Azeret_Mono, Caveat } from 'next/font/google';
import { Providers } from '@/components/providers';
import { env } from '@/lib/env';
import './globals.css';

const specialGothic = Special_Gothic_Expanded_One({
  variable: '--font-heading',
  weight: '400',
  subsets: ['latin'],
  adjustFontFallback: false,
  fallback: ['system-ui', 'sans-serif'],
});

const azeretMono = Azeret_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const caveat = Caveat({
  variable: '--font-handwriting',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const DESCRIPTION =
  'Your playlist has great songs in a terrible order. TuneIt reads the tempo and energy of every track and reorders them so each transition lands.';

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: 'TuneIt — fix the flow of your playlist',
    template: '%s · TuneIt',
  },
  description: DESCRIPTION,
  applicationName: 'TuneIt',
  openGraph: {
    type: 'website',
    siteName: 'TuneIt',
    title: "TuneIt — it's not the songs, it's the order",
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: "TuneIt — it's not the songs, it's the order",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#F8FFE5',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${specialGothic.variable} ${azeretMono.variable} ${caveat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-[#F8FFE5] text-black flex min-h-full flex-col font-mono selection:bg-[#FFDD00]">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
