/**
 * Range dans leur sujet les passages trouvés à la vérification des
 * absences, au nom de l'équipe, avec leur raison :
 *
 *   npx tsx src/scripts/apply-absence-decisions.ts absences.tsv decisions.tsv
 *
 * absences.tsv vient de audit-absences ; decisions.tsv donne, par paire,
 * « oui », le rang du passage et la raison.
 */
import { TOOL_ACCOUNT_ID } from '../domain/tool-account';
import { liveProgrammes } from '../common/live-programmes';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
  DecisionMode,
  LabelOrigin,
  LabelStatus,
} from '../generated/prisma/enums';

async function main() {
  const [absencesFile, decisionsFile] = process.argv.slice(2);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const rows = new Map<string, string[]>();
  for (const line of readFileSync(absencesFile, 'utf8').split('\n').slice(1)) {
    const p = line.split('\t');
    if (p.length > 8) rows.set(`${p[0]}\n${p[3]}`, p);
  }
  const decisions = readFileSync(decisionsFile, 'utf8')
    .split('\n')
    .map((l) => l.split('\t'))
    .filter((p) => p[1] === 'oui');
  const docs = await liveProgrammes(prisma, {
    select: {
      id: true,
      url: true,
    },
  });
  const liveId = new Map(docs.map((d) => [d.url, d.id]));

  let n = 0;
  for (const [pair, , rank, reason] of decisions) {
    n++;
    const r = rows.get(`${pair}\n${rank}`);
    if (!r) {
      console.log(
        `[${n}/${decisions.length}] paire ${pair} : passage introuvable`,
      );
      continue;
    }
    const [, topic, name, , , url, , position, quote] = r;
    const code = topic.split(' ')[0];
    const candidate = await prisma.candidate.findFirst({ where: { name } });
    const measure = await prisma.measure.findFirst({
      where: { documentId: liveId.get(url), position: Number(position) },
    });
    if (!candidate || !measure) {
      console.log(
        `[${n}/${decisions.length}] ${name} · ${topic} : passage introuvable`,
      );
      continue;
    }
    const key = {
      candidateId: candidate.id,
      documentUrl: url,
      heading: measure.article,
      capCode: code,
    };
    // Un script n'est jamais une personne : sa décision est celle d'un
    // assistant, même signée du compte de l'équipe.
    const signed = {
      decidedById: TOOL_ACCOUNT_ID,
      decidedAt: new Date(),
      decisionMode: DecisionMode.assistant,
      reason,
    };
    await prisma.capLabel.upsert({
      where: {
        candidateId_documentUrl_heading_capCode_unit: {
          ...key,
          unit: 'chapter',
        },
      },
      create: {
        ...key,
        fromPosition: Number(position),
        origin: LabelOrigin.person,
        status: LabelStatus.validated,
        ...signed,
      },
      update: {
        status: LabelStatus.validated,
        fromPosition: Number(position),
        ...signed,
      },
    });
    console.log(
      `[${n}/${decisions.length}] ${name} · ${topic.replace(/^\d+ /, '')} ← « ${quote.slice(0, 80)}… » (${reason})`,
    );
  }
  console.log(`\n${n} passages rangés.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
