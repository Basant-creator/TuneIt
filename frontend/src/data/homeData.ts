export const chaoticTracks = [
  {
    id: 't1',
    name: 'Strobe',
    artist: 'deadmau5',
    bpm: 128,
    key: '10A',
    energy: 0.72,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120',
  },
  {
    id: 't2',
    name: 'Innerbloom',
    artist: 'RÜFÜS DU SOL',
    bpm: 122,
    key: '8A',
    energy: 0.58,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120',
  },
  {
    id: 't3',
    name: 'Opus',
    artist: 'Eric Prydz',
    bpm: 126,
    key: '8B',
    energy: 0.84,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=120',
  },
  {
    id: 't4',
    name: 'Language',
    artist: 'Porter Robinson',
    bpm: 128,
    key: '8B',
    energy: 0.89,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120',
  },
];

/**
 * The same four tracks, in the order the real Rise engine produces for them
 * (backend runFlowEngine('bu', ...)): energy climbs 0.58 -> 0.72 -> 0.84 -> 0.89.
 *
 * The previous hand-written order ended by dropping from 0.89 back to 0.72, and
 * scored 84.0 against the "chaotic" order's 85.0 — so the demo meant to sell
 * smoother flow was the less smooth of the two.
 */
export const optimizedTracks = [
  {
    id: 't2',
    name: 'Innerbloom',
    artist: 'RÜFÜS DU SOL',
    bpm: 122,
    key: '8A',
    energy: 0.58,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120',
  },
  {
    id: 't1',
    name: 'Strobe',
    artist: 'deadmau5',
    bpm: 128,
    key: '10A',
    energy: 0.72,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120',
  },
  {
    id: 't3',
    name: 'Opus',
    artist: 'Eric Prydz',
    bpm: 126,
    key: '8B',
    energy: 0.84,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=120',
  },
  {
    id: 't4',
    name: 'Language',
    artist: 'Porter Robinson',
    bpm: 128,
    key: '8B',
    energy: 0.89,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120',
  },
];

export const flowModes = [
  {
    id: 'bu',
    emoji: '',
    title: 'Rise',
    description: "Starts with your calmest tracks and climbs, stepping down now and then so it never feels like a treadmill. Your loudest songs land last. Made for workouts and anything that needs momentum.",
    color: 'pink' as const,
    bgClass: 'bg-brand-pink text-white',
    svgFillColor: 'var(--brand-pink)',
    features: [
      'Opens with your calmest tracks',
      'Climbs in steps, with small dips',
      'Your loudest tracks land last',
    ],
    desc: 'Builds up'
  },
  {
    id: 'df',
    emoji: '',
    title: 'Drift',
    description: "Holds the tempo and energy close together and sets aside anything that would jolt you out of focus. Made for studying, coding and long reads.",
    color: 'blue' as const,
    bgClass: 'bg-brand-blue text-black',
    svgFillColor: 'var(--brand-blue)',
    features: [
      'Keeps tempo and energy steady',
      'Sets aside tracks that would jolt you',
      'Shows you exactly what it removed',
    ],
    desc: 'Stays level'
  },
  {
    id: 'ph',
    emoji: '',
    title: 'Unhinged',
    description: "Throws deliberate curveballs: a big energy swing, anchored by a matching tempo or key so it lands as a surprise rather than a mistake. Made for parties and games.",
    color: 'orange' as const,
    bgClass: 'bg-brand-orange text-white',
    svgFillColor: 'var(--brand-orange)',
    features: [
      'Big energy swings, on purpose',
      'Each swing anchored by tempo or key',
      'Recovers before the next one',
    ],
    desc: 'Swerves on purpose'
  },
  {
    id: 'cm',
    emoji: '',
    title: 'Frame',
    description: "Shapes the playlist like a film: an opening act at your playlist's usual energy, a middle that builds to one clear peak, then a resolution. Made for listening start to finish.",
    color: 'white' as const,
    bgClass: 'bg-brand-yellow text-black',
    svgFillColor: 'var(--brand-yellow)',
    features: [
      'Act I sits at your usual energy',
      'Act II builds to one clear peak',
      'Act III resolves it',
    ],
    desc: 'Three acts'
  },
];
