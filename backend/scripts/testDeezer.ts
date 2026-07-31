import axios from 'axios';

async function testDeezerTrack() {
  try {
    const res = await axios.get('https://api.deezer.com/track/3135556');
    console.log('Title:', res.data.title);
    console.log('Artist:', res.data.artist?.name);
    console.log('BPM:', res.data.bpm);
  } catch (e: any) {
    console.error('Deezer track error:', e.message);
  }
}

testDeezerTrack();
