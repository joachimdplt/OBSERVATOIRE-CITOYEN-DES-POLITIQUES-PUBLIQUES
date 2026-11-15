/**
 * Range dans leur sujet les passages trouvés à la vérification des
 * absences, au nom de l'équipe, avec leur raison :
 *
 *   npx tsx src/scripts/apply-absence-decisions.ts absences.tsv decisions.tsv
 *
 * absences.tsv vient de audit-absences ; decisions.tsv donne, par paire,
 * « oui », le rang du passage et la raison.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { currentCaptures } from '../domain/programme';
import { PrismaClient } from '../generated/prisma/client';
import {
  DocumentKind,
  LabelOrigin,
  LabelStatus,
  Role,
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
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: Role.admin, active: true },
    orderBy: { createdAt: 'asc' },
  });
  const docs = await prisma.politicalDocument.findMany({
    where: {
      kind: DocumentKind.programme,
      sourceRef: { not: null },
      retiredAt: null,
    },
    select: {
      id: true,
      url: true,
      sourceRef: true,
      fetchedAt: true,
      createdAt: true,
    },
  });
  const current = currentCaptures(
    docs.map((d) => ({
      id: d.id,
      sourceRef: d.sourceRef!,
      fetchedAt: d.fetchedAt ?? d.createdAt,
    })),
  );
  const liveId = new Map(
    docs.filter((d) => current.has(d.id)).map((d) => [d.url, d.id]),
  );

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
    const signed = { decidedById: admin.id, decidedAt: new Date(), reason };
    await prisma.capLabel.upsert({
      where: { candidateId_documentUrl_heading_capCode: key },
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
