/**
 * Le vote sur les rangements déjà faits par le modèle :
 *
 *   npm run cap:vote
 *
 * Les passages et la grille doivent être vectorisés (npm run embed).
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { voteCapLabels } from '../features/subjects/vote-cap-labels/vote-cap-labels';
import { PrismaClient } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const r = await voteCapLabels(prisma as unknown as PrismaService, (line) =>
      console.log(line),
    );
    console.log(
      `\n${r.voted} rangements votés : ${r.agreed} d’accord (affichés), ${r.review} à relire, ${r.skipped} sans vecteur.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
