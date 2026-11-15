/**
 * La mesure d'une quatrième voix dans le vote : le titre sous lequel le
 * candidat range lui-même l'extrait (son document, sa rubrique), rapproché
 * du sujet de la grille le plus proche par le sens.
 *
 *   npx tsx src/scripts/compare-title-vote.ts
 *
 * Le jeu de test : les blocs relus (réponse du modèle gardée, ou corrigée).
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { documentName } from '../domain/programme-reading';
import { cosine, nearestTopic, neighboursTopic } from '../domain/vote';
import {
  EMBEDDING_MODEL,
  loadVoteContext,
} from '../features/subjects/vote-cap-labels/vote-cap-labels';
import { PrismaClient } from '../generated/prisma/client';
import { LabelOrigin, LabelStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';

const URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

async function embed(input: string[]): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  for (let i = 0; i < input.length; i += 32) {
    const res = await fetch(`${URL}/api/embed`, {
      method: 'POST',
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: input.slice(i, i + 32) }),
    });
    const { embeddings } = (await res.json()) as { embeddings: number[][] };
    out.push(...embeddings.map((e) => new Float32Array(e)));
  }
  return out;
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const ctx = await loadVoteContext(prisma as unknown as PrismaService);
  const docs = await prisma.politicalDocument.findMany({ select: { url: true, title: true } });
  const titleOf = new Map(docs.map((d) => [d.url, documentName(d.title)]));
  const labels = await prisma.capLabel.findMany();
  const chapterKey = (l: { candidateId: string; documentUrl: string; heading: string; fromPosition: number | null }) =>
    `${l.candidateId}\n${l.documentUrl}\n${l.heading}\n${l.fromPosition ?? ''}`;

  // Le jeu de test : chaque bloc relu, avec la réponse du modèle et la bonne.
  const person = new Map(
    labels.filter((l) => l.origin === LabelOrigin.person && l.status === LabelStatus.validated).map((l) => [chapterKey(l), l.capCode]),
  );
  const truth = labels.flatMap((l) => {
    if (l.origin !== LabelOrigin.model || l.fromPosition === null) return [];
    if (l.status === LabelStatus.rejected) {
      const right = person.get(chapterKey(l));
      return right ? [{ l, model: l.capCode, right }] : [];
    }
    return [{ l, model: l.capCode, right: l.capCode }];
  });
  const review = labels.filter((l) => l.status === LabelStatus.review).map((l) => ({ l, model: l.capCode, right: null as string | null }));

  // Les titres du candidat : son document, puis son document et sa rubrique.
  const texts = [...new Set([...truth, ...review].flatMap(({ l }) => [titleOf.get(l.documentUrl) ?? '', `${titleOf.get(l.documentUrl) ?? ''} — ${l.heading}`]))];
  console.log(`Vectorisation de ${texts.length} titres…`);
  const vectors = new Map(texts.map((t, i) => [t, i]));
  const embedded = await embed(texts);
  const vec = (t: string) => embedded[vectors.get(t)!];
  const margin = (v: Float32Array) => {
    const s = ctx.topicVectors.map((t) => ({ m: t.major, s: cosine(v, t.vector) })).sort((a, b) => b.s - a.s);
    const second = s.find((x) => x.m !== s[0].m);
    return s[0].s - (second?.s ?? 0);
  };

  const rows = [...truth, ...review].flatMap(({ l, model, right }) => {
    const v = ctx.vectorOf(ctx.blockOf(l));
    if (!v) return [];
    const doc = titleOf.get(l.documentUrl) ?? '';
    const tv = vec(doc);
    const hv = vec(`${doc} — ${l.heading}`);
    return [{
      right, model,
      grille: nearestTopic(v, ctx.topicVectors),
      voisins: neighboursTopic(v, ctx.known.filter((k) => k.chapter !== `${l.candidateId}\n${l.heading}`), `${l.candidateId}\n${l.heading}`),
      titre: nearestTopic(tv, ctx.topicVectors), titreMarge: margin(tv),
      rubrique: nearestTopic(hv, ctx.topicVectors), rubriqueMarge: margin(hv),
      who: `${doc.slice(0, 30)} — ${l.heading.slice(0, 40)}`,
    }];
  });
  const known = rows.filter((r) => r.right);
  const pending = rows.filter((r) => !r.right);
  const pct = (a: number, b: number) => (b ? `${a}/${b} = ${Math.round((100 * a) / b)} % (±${Math.round(196 * Math.sqrt((a / b) * (1 - a / b) / b))})` : '-');

  console.log(`\nSur ${known.length} blocs relus :`);
  for (const k of ['model', 'grille', 'voisins', 'titre', 'rubrique'] as const)
    console.log(`  ${k.padEnd(9)} seul : ${pct(known.filter((r) => r[k] === r.right).length, known.length)}`);

  const rules: [string, (r: (typeof rows)[number], s: number) => boolean][] = [
    ['modèle + (grille ou voisins)            ', (r) => r.model === r.grille || r.model === r.voisins],
    ['modèle + (grille, voisins ou titre)      ', (r, s) => r.model === r.grille || r.model === r.voisins || (r.titreMarge >= s && r.model === r.titre)],
    ['modèle + (grille, voisins, titre, rubr.) ', (r, s) => r.model === r.grille || r.model === r.voisins || (r.titreMarge >= s && r.model === r.titre) || (r.rubriqueMarge >= s && r.model === r.rubrique)],
  ];
  // Sans le modèle : la grille et les voisins d'accord, avec ou sans le
  // classement du candidat.
  const skip: [string, (r: (typeof rows)[number]) => boolean][] = [
    ['grille = voisins                        ', (r) => r.grille === r.voisins],
    ['grille = voisins = (titre ou rubrique)  ', (r) => r.grille === r.voisins && (r.titre === r.grille || r.rubrique === r.grille)],
  ];
  for (const [name, rule] of skip) {
    const kept = known.filter(rule);
    console.log(`  sans modèle, ${name} précision ${pct(kept.filter((r) => r.grille === r.right).length, kept.length)} · couverture ${Math.round((100 * kept.length) / known.length)} %`);
  }
  for (const s of [0]) {
    console.log(`\nMarge minimale du titre : ${s}`);
    for (const [name, rule] of rules) {
      const kept = known.filter((r) => rule(r, s));
      const freed = pending.filter((r) => rule(r, s)).length;
      console.log(`  ${name} précision ${pct(kept.filter((r) => r.model === r.right).length, kept.length)} · couverture ${Math.round((100 * kept.length) / known.length)} % · libère ${freed}/${pending.length} à relire`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
