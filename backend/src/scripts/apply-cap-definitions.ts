/**
 * Écrit en base la traduction française des définitions des sous-sujets
 * (domain/cap-definitions.ts), marquée `assistant`. Une définition déjà
 * relue par une personne n'est jamais écrasée.
 *
 *   npx tsx src/scripts/apply-cap-definitions.ts
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { CAP_DEFINITIONS_FR } from '../domain/cap-definitions';
import { PrismaClient } from '../generated/prisma/client';
import { DecisionMode } from '../generated/prisma/enums';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    let written = 0;
    for (const [code, descriptionFr] of Object.entries(CAP_DEFINITIONS_FR)) {
      const { count } = await prisma.capTopic.updateMany({
        where: {
          code,
          OR: [
            { descriptionFrBy: null },
            { descriptionFrBy: DecisionMode.assistant },
          ],
        },
        data: { descriptionFr, descriptionFrBy: DecisionMode.assistant },
      });
      written += count;
    }
    const missing = await prisma.capTopic.count({
      where: { level: 2, descriptionFr: null },
    });
    console.log(
      `${written} définitions écrites (traduction d’un assistant, non relue) ; ${missing} sous-sujets sans définition française.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
