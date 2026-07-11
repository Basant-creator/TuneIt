export interface Track {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  key: string;
  energy: number;
  coverUrl: string;
  category: 'bu' | 'df' | 'ph' | 'cm';
  role: string;
}

export const PRESET_TRACKS: Track[] = [
  // Rise (bu)
  {
    id: 'r1',
    name: 'Feel Good Inc.',
    artist: 'Gorillaz',
    bpm: 139,
    key: '10A',
    energy: 0.70,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80',
    category: 'bu',
    role: 'The playful spark'
  },
  {
    id: 'r2',
    name: 'Ready for the Fire',
    artist: 'Valley of Wolves',
    bpm: 145,
    key: '11A',
    energy: 0.78,
    coverUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=80',
    category: 'bu',
    role: 'The ignition point'
  },
  {
    id: 'r3',
    name: 'Supernatural',
    artist: 'Barns Courtney',
    bpm: 150,
    key: '12A',
    energy: 0.82,
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80',
    category: 'bu',
    role: 'The mid-point peak'
  },
  {
    id: 'r4',
    name: 'Everything Black',
    artist: 'Unlike Pluto',
    bpm: 140,
    key: '1A',
    energy: 0.88,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=80',
    category: 'bu',
    role: 'The dark crescendo'
  },
  {
    id: 'r5',
    name: 'Stronger',
    artist: 'Kanye West',
    bpm: 104,
    key: '2A',
    energy: 0.92,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80',
    category: 'bu',
    role: 'The ultimate payoff'
  },
  {
    id: 'r6',
    name: 'Centuries',
    artist: 'Fall Out Boy',
    bpm: 176,
    key: '11A',
    energy: 0.85,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80',
    category: 'bu',
    role: 'The stadium anthem'
  },
  {
    id: 'r7',
    name: 'Legendary',
    artist: 'Welshly Arms',
    bpm: 118,
    key: '12A',
    energy: 0.80,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=80',
    category: 'bu',
    role: 'The soul-rock stomp'
  },
  {
    id: 'r8',
    name: 'Believer',
    artist: 'Imagine Dragons',
    bpm: 125,
    key: '9A',
    energy: 0.78,
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=80',
    category: 'bu',
    role: 'The pulsing march'
  },

  // Drift (df)
  {
    id: 'd1',
    name: 'Simpson Wave 1995',
    artist: 'FrankJavCee',
    bpm: 170,
    key: '2A',
    energy: 0.55,
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=80',
    category: 'df',
    role: 'The entry point'
  },
  {
    id: 'd2',
    name: 'Crystal Skies',
    artist: 'VXLLAIN, iGRES, ENXK',
    bpm: 103,
    key: '3A',
    energy: 0.65,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=80',
    category: 'df',
    role: 'The ambient bridge'
  },
  {
    id: 'd3',
    name: 'Resonance',
    artist: 'HOME',
    bpm: 170,
    key: '4A',
    energy: 0.65,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=80',
    category: 'df',
    role: 'The emotional core'
  },
  {
    id: 'd4',
    name: 'Innerbloom',
    artist: 'RÜFÜS DU SOL',
    bpm: 122,
    key: '8A',
    energy: 0.84,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=80',
    category: 'df',
    role: 'The final horizon'
  },
  {
    id: 'd5',
    name: 'Intro',
    artist: 'The xx',
    bpm: 120,
    key: '10A',
    energy: 0.50,
    coverUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=80',
    category: 'df',
    role: 'The ambient whisper'
  },
  {
    id: 'd6',
    name: 'Chamber of Reflection',
    artist: 'Mac DeMarco',
    bpm: 130,
    key: '8B',
    energy: 0.52,
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80',
    category: 'df',
    role: 'The hazy synth-walk'
  },
  {
    id: 'd7',
    name: 'Intro',
    artist: 'Alt-J',
    bpm: 124,
    key: '11A',
    energy: 0.58,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80',
    category: 'df',
    role: 'The textured prelude'
  },
  {
    id: 'd8',
    name: 'Glue',
    artist: 'Bicep',
    bpm: 130,
    key: '8A',
    energy: 0.70,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80',
    category: 'df',
    role: 'The breakbeat dream'
  },

  // Frame (cm)
  {
    id: 'f1',
    name: 'The Chain',
    artist: 'Fleetwood Mac',
    bpm: 152,
    key: '8A',
    energy: 0.65,
    coverUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=80',
    category: 'cm',
    role: 'The dramatic prologue'
  },
  {
    id: 'f2',
    name: 'We Are The People',
    artist: 'Empire of the Sun',
    bpm: 120,
    key: '9A',
    energy: 0.72,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80',
    category: 'cm',
    role: 'The dreamlike journey'
  },
  {
    id: 'f3',
    name: 'Feel It Still',
    artist: 'Portugal. The Man',
    bpm: 79,
    key: '10A',
    energy: 0.78,
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80',
    category: 'cm',
    role: 'The rebel detour'
  },
  {
    id: 'f4',
    name: 'Stayin\' Alive',
    artist: 'Bee Gees',
    bpm: 104,
    key: '11A',
    energy: 0.82,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=80',
    category: 'cm',
    role: 'The street-smart walk'
  },
  {
    id: 'f5',
    name: 'I\'m Still Standing',
    artist: 'Elton John',
    bpm: 177,
    key: '12A',
    energy: 0.88,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80',
    category: 'cm',
    role: 'The credits roll'
  },
  {
    id: 'f6',
    name: 'Nightcall',
    artist: 'Kavinsky',
    bpm: 116,
    key: '7A',
    energy: 0.60,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80',
    category: 'cm',
    role: 'The neon-lit drive'
  },
  {
    id: 'f7',
    name: 'Midnight City',
    artist: 'M83',
    bpm: 105,
    key: '6B',
    energy: 0.75,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=80',
    category: 'cm',
    role: 'The starry climax'
  },
  {
    id: 'f8',
    name: 'Heroes',
    artist: 'David Bowie',
    bpm: 112,
    key: '5B',
    energy: 0.70,
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=80',
    category: 'cm',
    role: 'The widescreen anthem'
  },

  // Unhinged (ph)
  {
    id: 'u1',
    name: 'Why Can\'t We Be Friends',
    artist: 'The Academic',
    bpm: 120,
    key: '5B',
    energy: 0.68,
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80',
    category: 'ph',
    role: 'The sunny prelude'
  },
  {
    id: 'u2',
    name: 'Play It Cool',
    artist: 'Tipling Rock',
    bpm: 100,
    key: '7B',
    energy: 0.70,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=80',
    category: 'ph',
    role: 'The smooth slide'
  },
  {
    id: 'u3',
    name: 'My Old Ways',
    artist: 'Tame Impala',
    bpm: 123,
    key: '1B',
    energy: 0.75,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80',
    category: 'ph',
    role: 'The pivot'
  },
  {
    id: 'u4',
    name: 'Gold Digger',
    artist: 'Kanye West',
    bpm: 93,
    key: '6A',
    energy: 0.82,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80',
    category: 'ph',
    role: 'The sudden switch'
  },
  {
    id: 'u5',
    name: 'Hit\' Em Up',
    artist: '2Pac',
    bpm: 95,
    key: '11A',
    energy: 0.88,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=80',
    category: 'ph',
    role: 'The ultimate curveball'
  },
  {
    id: 'u6',
    name: 'Float On',
    artist: 'Modest Mouse',
    bpm: 101,
    key: '7A',
    energy: 0.72,
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=80',
    category: 'ph',
    role: 'The quirky pickup'
  },
  {
    id: 'u7',
    name: 'Loser',
    artist: 'Beck',
    bpm: 85,
    key: '6B',
    energy: 0.65,
    coverUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=80',
    category: 'ph',
    role: 'The slacker-rap detour'
  },
  {
    id: 'u8',
    name: 'Seven Nation Army',
    artist: 'The White Stripes',
    bpm: 120,
    key: '9A',
    energy: 0.80,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80',
    category: 'ph',
    role: 'The minimalist roar'
  }
];
