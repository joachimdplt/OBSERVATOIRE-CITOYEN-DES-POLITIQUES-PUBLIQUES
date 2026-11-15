/**
 * La vérification des absences : pour chaque sujet et chaque candidat dont
 * le programme collecté n'a rien de rangé dans ce sujet, les passages dont
 * le sens est le plus proche du sujet, à relire.
 *
 *   npx tsx src/scripts/audit-absences.ts > absences.tsv
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { currentCaptures } from '../domain/programme';
import { cosine, toVector } from '../domain/vote';
import { EMBEDDING_MODEL } from '../features/subjects/vote-cap-labels/vote-cap-labels';
import { PrismaClient } from '../generated/prisma/client';
import { DocumentKind, LabelStatus } from '../generated/prisma/enums';

const SHOWN = 5;

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const topics = await prisma.capTopic.findMany();
  const majors = topics.filter((t) => t.level === 1).sort((a, b) => +a.code - +b.code);
  const majorOf = new Map(topics.map((t) => [t.code, t.level === 1 ? t.code : t.majorCode!]));
  const topicVectors = (await prisma.topicVector.findMany({ where: { model: EMBEDDING_MODEL } })).map((t) => ({ major: majorOf.get(t.code)!, v: toVector(t.vector) }));

  const docs = await prisma.politicalDocument.findMany({
    where: { kind: DocumentKind.programme, sourceRef: { not: null }, retiredAt: null, candidateId: { not: null } },
    select: { id: true, url: true, title: true, candidateId: true, sourceRef: true, fetchedAt: true, createdAt: true },
  });
  const current = currentCaptures(docs.map((d) => ({ id: d.id, sourceRef: d.sourceRef!, fetchedAt: d.fetchedAt ?? d.createdAt })));
  const live = docs.filter((d) => current.has(d.id));
  const docOf = new Map(live.map((d) => [d.id, d]));
  const measures = await prisma.measure.findMany({ where: { documentId: { in: live.map((d) => d.id) } }, select: { id: true, documentId: true, article: true, quote: true, position: true } });
  const vectors = new Map((await prisma.passageVector.findMany({ where: { model: EMBEDDING_MODEL } })).map((v) => [v.measureId, toVector(v.vector)]));
  const shown = await prisma.capLabel.findMany({ where: { status: { in: [LabelStatus.proposed, LabelStatus.validated] } }, select: { candidateId: true, capCode: true } });
  const has = new Set(shown.map((l) => `${l.candidateId}\n${l.capCode}`));
  const candidates = await prisma.candidate.findMany({ select: { id: true, name: true } });

  console.log(['paire', 'sujet', 'candidat', 'n', 'proximite', 'document', 'rubrique', 'position', 'passage'].join('\t'));
  let pair = 0;
  for (const t of majors) {
    const tv = topicVectors.filter((x) => x.major === t.code);
    for (const c of candidates) {
      const mine = measures.filter((m) => docOf.get(m.documentId)?.candidateId === c.id);
      if (mine.length === 0 || has.has(`${c.id}\n${t.code}`)) continue;
      pair++;
      const scored = mine
        .filter((m) => vectors.has(m.id))
        .map((m) => ({ m, s: Math.max(...tv.map((x) => cosine(vectors.get(m.id)!, x.v))) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, SHOWN);
      scored.forEach(({ m, s }, i) => {
        const d = docOf.get(m.documentId)!;
        console.log([pair, `${t.code} ${t.labelFr}`, c.name, i + 1, s.toFixed(3), d.url, m.article.replace(/\s+/g, ' ').slice(0, 120), m.position ?? 0, m.quote.replace(/\s+/g, ' ').slice(0, 500)].join('\t'));
      });
    }
  }
  console.error(`${pair} paires sujet-candidat sans rien de rangé`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
