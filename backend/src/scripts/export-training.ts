/**
 * L'export des données d'entraînement du classeur, pour comparer d'autres
 * modèles en Python (tools/measure/neural.py) : chaque rangement affiché,
 * avec le vecteur de son bloc, son sujet, et s'il a été vérifié par une
 * personne (la seule référence du test).
 *
 *   npx tsx src/scripts/export-training.ts
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadVoteContext } from '../common/subject-vectors';
import { PrismaClient } from '../generated/prisma/client';
import {
  DecisionMode,
  LabelOrigin,
  LabelStatus,
} from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';

const OUT = resolve(__dirname, '../../../tools/measure/data/training.json');

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const ctx = await loadVoteContext(prisma as unknown as PrismaService);
  const labels = await prisma.capLabel.findMany({
    where: { status: { in: [LabelStatus.proposed, LabelStatus.validated] } },
  });
  const rows = labels.flatMap((l) => {
    const v = ctx.vectorOf(ctx.blockOf(l));
    return v
      ? [
          {
            chapter: `${l.candidateId}\n${l.heading}`,
            code: l.capCode,
            person: l.decisionMode === DecisionMode.person,
            // Rangé à la main par l'assistant, sans vote : la source de
            // la plupart des refus.
            assistantPlaced:
              l.origin === LabelOrigin.person &&
              l.decisionMode === DecisionMode.assistant,
            vector: Array.from(v, (x) => Math.round(x * 1e5) / 1e5),
          },
        ]
      : [];
  });
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(rows));
  console.log(
    `${rows.length} rangements exportés, dont ${rows.filter((r) => r.person).length} vérifiés par une personne → ${OUT}`,
  );
  await prisma.$disconnect();
}

void main();
