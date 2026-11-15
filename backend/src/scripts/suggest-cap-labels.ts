/**
 * Les propositions de sujets CAP pour chaque chapitre des programmes :
 *
 *   npm run cap:suggest
 *
 * Le classeur local (dossier classifier/) doit être installé. Les chapitres
 * déjà étiquetés ne sont pas reproposés.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { BgeTopicClassifier } from '../adapters/classifier/bge-topic-classifier';
import { suggestCapLabels } from '../features/subjects/suggest-cap-labels/suggest-cap-labels';
import { PrismaClient } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const r = await suggestCapLabels(
      prisma as unknown as PrismaService,
      new BgeTopicClassifier(),
    );
    console.log(
      `${r.chapters} chapitres, ${r.proposed} nouvellement proposés (${r.labels} étiquettes, modèle ${r.model || 'aucun'}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
