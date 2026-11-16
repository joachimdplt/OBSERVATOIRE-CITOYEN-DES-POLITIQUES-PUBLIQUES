/**
 * Le test d'un classeur appris sur les vecteurs : une régression logistique
 * (softmax) entraînée sur les rangements affichés, mesurée sur les blocs
 * relus qu'elle n'a jamais vus (validation croisée par chapitre).
 *
 *   npx tsx src/scripts/test-vector-classifier.ts
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadVoteContext } from '../features/subjects/vote-cap-labels/vote-cap-labels';
import { PrismaClient } from '../generated/prisma/client';
import { DecisionMode, LabelOrigin, LabelStatus } from '../generated/prisma/enums';

/** En dessous, la marge d'erreur dépasse quinze points : on ne mesure pas. */
const MIN_TRUTH = 50;
import type { PrismaService } from '../prisma/prisma.service';

type Example = { chapter: string; x: Float32Array; y: number };

/** Une régression logistique à plusieurs classes, apprise par Adam. */
function train(data: Example[], classes: number, dim: number, epochs = 60) {
  const W = new Float32Array(classes * dim);
  const b = new Float32Array(classes);
  const mW = new Float32Array(W.length), vW = new Float32Array(W.length);
  const mB = new Float32Array(classes), vB = new Float32Array(classes);
  const lr = 0.01, l2 = 1e-4, b1 = 0.9, b2 = 0.999, eps = 1e-8;
  let t = 0;
  const p = new Float32Array(classes);
  for (let e = 0; e < epochs; e++) {
    const order = [...data.keys()].sort(() => Math.random() - 0.5);
    for (let start = 0; start < order.length; start += 32) {
      const batch = order.slice(start, start + 32);
      const gW = new Float32Array(W.length);
      const gB = new Float32Array(classes);
      for (const i of batch) {
        const { x, y } = data[i];
        let max = -Infinity;
        for (let k = 0; k < classes; k++) {
          let s = b[k];
          const o = k * dim;
          for (let j = 0; j < dim; j++) s += W[o + j] * x[j];
          p[k] = s;
          if (s > max) max = s;
        }
        let sum = 0;
        for (let k = 0; k < classes; k++) sum += p[k] = Math.exp(p[k] - max);
        for (let k = 0; k < classes; k++) {
          const g = p[k] / sum - (k === y ? 1 : 0);
          gB[k] += g;
          const o = k * dim;
          for (let j = 0; j < dim; j++) gW[o + j] += g * x[j];
        }
      }
      t++;
      const n = batch.length;
      for (let i = 0; i < W.length; i++) {
        const g = gW[i] / n + l2 * W[i];
        mW[i] = b1 * mW[i] + (1 - b1) * g;
        vW[i] = b2 * vW[i] + (1 - b2) * g * g;
        W[i] -= (lr * (mW[i] / (1 - b1 ** t))) / (Math.sqrt(vW[i] / (1 - b2 ** t)) + eps);
      }
      for (let k = 0; k < classes; k++) {
        const g = gB[k] / n;
        mB[k] = b1 * mB[k] + (1 - b1) * g;
        vB[k] = b2 * vB[k] + (1 - b2) * g * g;
        b[k] -= (lr * (mB[k] / (1 - b1 ** t))) / (Math.sqrt(vB[k] / (1 - b2 ** t)) + eps);
      }
    }
  }
  return (x: Float32Array) => {
    let best = 0, score = -Infinity;
    const s = new Float32Array(classes);
    for (let k = 0; k < classes; k++) {
      let v = b[k];
      const o = k * dim;
      for (let j = 0; j < dim; j++) v += W[o + j] * x[j];
      s[k] = v;
      if (v > score) { score = v; best = k; }
    }
    // La probabilité de la meilleure classe : la confiance.
    let sum = 0;
    for (let k = 0; k < classes; k++) sum += Math.exp(s[k] - score);
    return { k: best, margin: 1 / sum };
  };
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const ctx = await loadVoteContext(prisma as unknown as PrismaService);
  const labels = await prisma.capLabel.findMany();
  const codes = [...new Set(labels.map((l) => l.capCode))].sort((a, b) => +a - +b);
  const index = new Map(codes.map((c, i) => [c, i]));
  const key = (l: { candidateId: string; documentUrl: string; heading: string; fromPosition: number | null }) =>
    `${l.candidateId}\n${l.documentUrl}\n${l.heading}\n${l.fromPosition ?? ''}`;
  const chapterOf = (l: { candidateId: string; heading: string }) => `${l.candidateId}\n${l.heading}`;

  // L'entraînement : tout ce qui est affiché (rangé par le vote ou validé).
  const shown = labels.filter((l) => l.status === LabelStatus.proposed || l.status === LabelStatus.validated);
  const trainSet: Example[] = shown.flatMap((l) => {
    const x = ctx.vectorOf(ctx.blockOf(l));
    return x ? [{ chapter: chapterOf(l), x, y: index.get(l.capCode)! }] : [];
  });

  // Le test : les blocs dont une personne (jamais un assistant) a validé le
  // sujet, avec la réponse du modèle d'origine.
  const modelAt = new Map(labels.filter((l) => l.origin === LabelOrigin.model).map((l) => [key(l), l.capCode]));
  const truth = labels.flatMap((l) => {
    if (l.decisionMode !== DecisionMode.person || l.status !== LabelStatus.validated || l.fromPosition === null) return [];
    const model = modelAt.get(key(l));
    const x = ctx.vectorOf(ctx.blockOf(l));
    return model && x ? [{ chapter: chapterOf(l), x, right: l.capCode, model }] : [];
  });
  if (truth.length < MIN_TRUTH) {
    console.log(`Seulement ${truth.length} blocs validés par une personne : il en faut au moins ${MIN_TRUTH} pour mesurer. Passez par les cartes de vérification.`);
    process.exit(0);
  }
  const dim = trainSet[0].x.length;
  console.log(`Entraînement sur ${trainSet.length} blocs affichés, test sur ${truth.length} blocs relus, ${codes.length} sujets, vecteurs de ${dim} nombres.`);

  // Validation croisée en 5 parts, par chapitre : un chapitre testé n'est
  // jamais dans l'entraînement.
  const chapters = [...new Set(truth.map((t) => t.chapter))].sort(() => Math.random() - 0.5);
  const fold = new Map(chapters.map((c, i) => [c, i % 5]));
  const results: { right: string; model: string; got: string; margin: number }[] = [];
  for (let f = 0; f < 5; f++) {
    const test = truth.filter((t) => fold.get(t.chapter) === f);
    const testChapters = new Set(test.map((t) => t.chapter));
    const t0 = Date.now();
    const predict = train(trainSet.filter((e) => !testChapters.has(e.chapter)), codes.length, dim);
    for (const t of test) {
      const { k, margin } = predict(t.x);
      results.push({ right: t.right, model: t.model, got: codes[k], margin });
    }
    console.log(`  part ${f + 1}/5 : appris en ${((Date.now() - t0) / 1000).toFixed(1)} s, ${test.length} blocs testés`);
  }
  const pct = (a: number, b: number) => `${a}/${b} = ${Math.round((100 * a) / b)} % (±${Math.round(196 * Math.sqrt((a / b) * (1 - a / b) / b))})`;
  const n = results.length;
  console.log(`\nSur ${n} blocs relus jamais vus à l'entraînement :`);
  console.log(`  classeur appris sur les vecteurs : ${pct(results.filter((r) => r.got === r.right).length, n)}`);
  console.log(`  Qwen3 (réponse d'origine)        : ${pct(results.filter((r) => r.model === r.right).length, n)}`);
  const agree = results.filter((r) => r.got === r.model);
  console.log(`  classeur et Qwen3 d'accord        : ${pct(agree.filter((r) => r.got === r.right).length, agree.length)} · ${Math.round((100 * agree.length) / n)} % des blocs`);
  for (const cut of [0.5, 0.6, 0.7, 0.8, 0.9]) {
    const sure = results.filter((r) => r.margin >= cut);
    console.log(`  classeur seul, confiance ≥ ${cut} : ${pct(sure.filter((r) => r.got === r.right).length, sure.length)} · ${Math.round((100 * sure.length) / n)} % des blocs`);
  }
  console.log('\nNB : les blocs relus que Qwen3 avait bien rangés sont majoritaires ; sa précision ici est flatteuse.');
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
