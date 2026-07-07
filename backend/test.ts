import prisma from './src/config/db';

async function main() {
  const result = await prisma.youtubeTrack.deleteMany({});
  console.log('Deleted all tracks from cache:', result);
}

main().finally(() => prisma.$disconnect());
