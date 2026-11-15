/**
 * La collecte des vidéos des chaînes suivies, en ligne de commande, pour une
 * tâche planifiée (cron) :
 *
 *   npm run collect:videos
 *
 * Le flux d'une chaîne ne donne que ses quinze dernières vidéos : la collecte
 * se lance au moins chaque jour pour ne rien perdre.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { YoutubeFeed } from '../adapters/youtube/youtube-feed';
import { collectVideos } from '../features/videos/collect-videos/collect-videos';
import { PrismaClient } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const report = await collectVideos(
      prisma as unknown as PrismaService,
      new YoutubeFeed(),
    );
    console.log(
      `${report.channels} chaînes lues, ${report.seen} vidéos vues, ${report.collected} nouvelles, ${report.linked} rattachements.`,
    );
    for (const f of report.failed) console.log(`Échec : ${f}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
