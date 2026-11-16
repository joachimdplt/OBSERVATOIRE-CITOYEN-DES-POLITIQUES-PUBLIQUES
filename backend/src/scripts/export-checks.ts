/**
 * L'export des verdicts pour l'outil de mesure Python (tools/measure).
 *
 * Une ligne par rangement décidé par une personne : son candidat, son
 * chapitre, le sujet de la machine, le verdict, les voix du vote (avec la
 * confiance du classeur quand elle a été gardée) et le vecteur de son bloc,
 * calculé exactement comme au rangement.
 *
 *   npx tsx src/scripts/export-checks.ts            verdicts de personnes
 *   npx tsx src/scripts/export-checks.ts --demo     décisions de l'assistant,
 *     pour essayer l'outil : la mesure est alors circulaire et ne prouve rien.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadVoteContext } from '../features/subjects/vote-cap-labels/vote-cap-labels';
import { PrismaClient } from '../generated/prisma/client';
import { DecisionMode, LabelStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';

const OUT = resolve(__dirname, '../../../tools/measure/data/checks.json');

async function main() {
  const demo = process.argv.includes('--demo');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const ctx = await loadVoteContext(prisma as unknown as PrismaService);
  const labels = await prisma.capLabel.findMany({
    where: {
      decisionMode: demo ? DecisionMode.assistant : DecisionMode.person,
      status: { in: [LabelStatus.validated, LabelStatus.rejected] },
    },
    include: {
      candidate: { select: { name: true } },
      checks: { orderBy: { checkedAt: 'desc' }, take: 1 },
    },
  });
  const rows = labels.flatMap((l) => {
    const v = ctx.vectorOf(ctx.blockOf(l));
    return [
      {
        id: l.id,
        candidate: l.candidate.name,
        chapter: `${l.candidateId}\n${l.documentUrl}\n${l.heading}`,
        origin: l.origin,
        code: l.capCode,
        // Le verdict d'une carte, sinon le statut décidé.
        verdict:
          l.checks[0]?.verdict ??
          (l.status === LabelStatus.validated ? 'accepted' : 'refused'),
        proposals: l.proposals ?? [],
        vector: v ? Array.from(v, (x) => Math.round(x * 1e5) / 1e5) : null,
      },
    ];
  });
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ demo, exportedAt: new Date(), rows }));
  console.log(
    `${rows.length} rangements exportés${demo ? ' (démonstration : décisions de l’assistant)' : ''} → ${OUT}`,
  );
  await prisma.$disconnect();
}

void main();
