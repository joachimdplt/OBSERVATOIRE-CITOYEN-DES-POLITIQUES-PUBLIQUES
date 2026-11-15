/**
 * Les photos libres des candidats, en ligne de commande :
 *
 *   npm run collect:photos
 *
 * À relancer quand un candidat est inscrit ou que sa photo change sur
 * Wikidata.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { WikimediaPhotos } from '../adapters/wikimedia/wikimedia-photos';
import { collectCandidatePhotos } from '../features/elections/collect-candidate-photos/collect-candidate-photos';
import { PrismaClient } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const report = await collectCandidatePhotos(
      prisma as unknown as PrismaService,
      new WikimediaPhotos(),
    );
    console.log(
      `${report.candidates} candidats, ${report.photos} photos libres.`,
    );
    if (report.without.length)
      console.log(`Sans photo libre : ${report.without.join(', ')}`);
    for (const f of report.failed) console.log(`Échec : ${f}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
