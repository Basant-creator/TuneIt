import type { Metadata } from 'next';
import { Special_Gothic_Expanded_One, Azeret_Mono, Caveat } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const specialGothic = Special_Gothic_Expanded_One({
  variable: '--font-heading',
  weight: '400',
  subsets: ['latin'],
  adjustFontFallback: false,
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

export const metadata: Metadata = {
  title: 'TuneIt | Fix The Flow of Your Music Playlists',
  description:
    'Your playlist has songs. It does not have flow. TuneIt transforms chaotic lists into intentional listening journeys using smart energy progression.',
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
