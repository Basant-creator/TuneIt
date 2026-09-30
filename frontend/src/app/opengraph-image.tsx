import { ImageResponse } from 'next/og';

/**
 * The card shown when a TuneIt link is shared. There was no og:image at all,
 * so links unfurled as a bare URL.
 */

export const alt = 'TuneIt — it is not the songs, it is the order.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#000000';
const PAPER = '#F8FFE5';
const YELLOW = '#FFDD00';
const PINK = '#FF006E';
const BLUE = '#01BEFE';
const ORANGE = '#F35B04';

/** A tiny energy curve drawn as bars, rising left to right. */
const BARS = [0.28, 0.4, 0.34, 0.52, 0.6, 0.55, 0.72, 0.84, 0.8, 0.94];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          padding: 64,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: INK, letterSpacing: -2 }}>TUNE</div>
          <div
            style={{
              display: 'flex',
              fontSize: 48,
              fontWeight: 900,
              color: INK,
              background: ORANGE,
              border: `6px solid ${INK}`,
              borderRadius: 12,
              padding: '0 16px',
              boxShadow: `6px 6px 0 ${INK}`,
            }}
          >
            IT
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 84, fontWeight: 900, color: INK, lineHeight: 0.95, letterSpacing: -3 }}>
            IT&apos;S NOT THE SONGS.
          </div>
          <div style={{ display: 'flex' }}>
            <div
              style={{
                fontSize: 84,
                fontWeight: 900,
                color: INK,
                lineHeight: 1,
                letterSpacing: -3,
                background: YELLOW,
                border: `6px solid ${INK}`,
                borderRadius: 18,
                padding: '4px 20px',
                boxShadow: `10px 10px 0 ${INK}`,
                transform: 'rotate(-1.5deg)',
              }}
            >
              IT&apos;S THE ORDER.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
            {BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 34,
                  height: Math.round(h * 120),
                  background: i % 3 === 0 ? PINK : i % 3 === 1 ? BLUE : YELLOW,
                  border: `4px solid ${INK}`,
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: INK, maxWidth: 520, textAlign: 'right' }}>
            Reorder any YouTube Music playlist by tempo and energy.
          </div>
        </div>
      </div>
    ),
    size
  );
}
