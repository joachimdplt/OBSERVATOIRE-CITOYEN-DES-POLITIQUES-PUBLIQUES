/**
 * La comparaison des façons de ranger, sur les blocs dont le bon sujet est
 * connu (vérifiés par l'équipe) :
 *
 *   npx tsx src/scripts/compare-filing.ts
 *
 * Pour chaque bloc, chaque méthode ne voit jamais la réponse de son propre
 * chapitre.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { OllamaTopicClassifier } from '../adapters/classifier/ollama-topic-classifier';
import { currentCaptures } from '../domain/programme';
import { PrismaClient } from '../generated/prisma/client';
import {
  DocumentKind,
  LabelOrigin,
  LabelStatus,
} from '../generated/prisma/enums';

const MODEL = 'bge-m3';
const toVector = (b: Uint8Array) =>
  new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const cosine = (a: Float32Array, b: Float32Array) => {
  let d = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return d / Math.sqrt(x * y);
};
const mean = (vs: Float32Array[]) => {
  const out = new Float32Array(vs[0].length);
  for (const v of vs)
    for (let i = 0; i < v.length; i++) out[i] += v[i] / vs.length;
  return out;
};

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const all = await prisma.capTopic.findMany();
  const major = new Map(
    all.map((t) => [t.code, t.level === 1 ? t.code : t.majorCode!]),
  );
  const labelOf = new Map(all.map((t) => [t.code, t.labelFr]));
  const grid = all
    .filter((t) => t.level === 1)
    .sort((a, b) => +a.code - +b.code)
    .map((t) => ({
      code: t.code,
      title: t.title,
      label: t.labelFr,
      subtopics: all
        .filter((x) => x.majorCode === t.code)
        .map((x) => ({
          code: x.code,
          title: x.title,
          label: x.labelFr,
          description: x.description,
        })),
    }));
  const topicVectors = (
    await prisma.topicVector.findMany({ where: { model: MODEL } })
  ).map((t) => ({ code: major.get(t.code)!, v: toVector(t.vector) }));

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
  const live = docs.filter((d) => current.has(d.id));
  const docByUrl = new Map(live.map((d) => [d.url, d.id]));
  const measures = await prisma.measure.findMany({
    where: { documentId: { in: live.map((d) => d.id) } },
    select: {
      id: true,
      documentId: true,
      article: true,
      quote: true,
      position: true,
    },
  });
  const vectors = new Map(
    (await prisma.passageVector.findMany({ where: { model: MODEL } })).map(
      (v) => [v.measureId, toVector(v.vector)],
    ),
  );

  const labels = await prisma.capLabel.findMany({
    where: { status: { not: LabelStatus.rejected } },
  });
  const blockOf = (l: (typeof labels)[number]) => {
    const docId = docByUrl.get(l.documentUrl);
    return measures
      .filter(
        (m) =>
          m.documentId === docId &&
          m.article === l.heading &&
          (m.position ?? 0) >= (l.fromPosition ?? 0),
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .slice(0, 8);
  };
  // Le jeu de test : les blocs vérifiés (relus justes, ou corrigés à la main).
  const truth = labels
    .filter((l) => l.fromPosition !== null || l.origin === LabelOrigin.person)
    .map((l) => ({ l, block: blockOf(l) }))
    .filter((x) => x.block.length > 0);
  // Les passages déjà rangés, pour la méthode des voisins.
  const known = truth.flatMap(({ l, block }) =>
    block
      .filter((m) => vectors.has(m.id))
      .map((m) => ({
        chapter: `${l.candidateId}\n${l.heading}`,
        code: l.capCode,
        v: vectors.get(m.id)!,
        text: `${l.heading}\n${m.quote}`,
        reason: l.reason,
        person: l.origin === LabelOrigin.person,
      })),
  );

  const classifier = new OllamaTopicClassifier();
  const score: Record<string, number> = {
    grille: 0,
    voisins: 0,
    'qwen + exemples par le sens': 0,
  };
  let n = 0;
  for (const { l, block } of truth) {
    const vs = block
      .map((m) => vectors.get(m.id))
      .filter((v): v is Float32Array => !!v);
    if (vs.length === 0) continue;
    n++;
    const v = mean(vs);
    const chapter = `${l.candidateId}\n${l.heading}`;
    // 1. Le sujet de la grille le plus proche.
    const byTopic = new Map<string, number>();
    for (const t of topicVectors)
      byTopic.set(t.code, Math.max(byTopic.get(t.code) ?? -1, cosine(v, t.v)));
    const grille = [...byTopic.entries()].sort((a, b) => b[1] - a[1])[0][0];
    // 2. Les dix passages rangés les plus proches, hors de ce chapitre.
    const near = known
      .filter((k) => k.chapter !== chapter)
      .map((k) => ({ k, s: cosine(v, k.v) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 10);
    const votes = new Map<string, number>();
    for (const { k, s } of near)
      votes.set(k.code, (votes.get(k.code) ?? 0) + s);
    const voisins = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    // 3. Qwen3, avec en exemples les corrections les plus proches par le sens.
    const examples = known
      .filter((k) => k.person && k.chapter !== chapter)
      .map((k) => ({ k, s: cosine(v, k.v) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(({ k }) => ({ text: k.text, code: k.code, reason: k.reason }));
    const text = [l.heading, ...block.map((m) => m.quote)]
      .join('\n')
      .slice(0, 1500);
    const [q] = await classifier.classify(
      grid,
      [{ id: '1', text }],
      examples,
      () => examples,
    );
    const got = { grille, voisins, 'qwen + exemples par le sens': q.code };
    for (const [k, c] of Object.entries(got)) if (c === l.capCode) score[k]++;
    console.log(
      `[${n}] ${l.heading.slice(0, 50)} | bon : ${labelOf.get(l.capCode)} | grille : ${labelOf.get(grille)} | voisins : ${labelOf.get(voisins)} | qwen : ${labelOf.get(q.code ?? '')}`,
    );
  }
  console.log(
    `\nSur ${n} blocs vérifiés : ${Object.entries(score)
      .map(([k, s]) => `${k} ${s}`)
      .join(' · ')}`,
  );
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
