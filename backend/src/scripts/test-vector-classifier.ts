/**
 * Le test d'un classeur appris sur les vecteurs : une régression logistique
 * (softmax) entraînée sur les rangements affichés, mesurée sur les blocs
 * relus qu'elle n'a jamais vus (validation croisée par chapitre).
 *
 *   npx tsx src/scripts/test-vector-classifier.ts
 */
import 'dotenv/config';
import { trainSoftmax } from '../domain/softmax';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadVoteContext } from '../common/subject-vectors';
import { PrismaClient } from '../generated/prisma/client';
import {
  DecisionMode,
  LabelOrigin,
  LabelStatus,
} from '../generated/prisma/enums';

/** En dessous, la marge d'erreur dépasse quinze points : on ne mesure pas. */
const MIN_TRUTH = 50;
import type { PrismaService } from '../prisma/prisma.service';
import {
  MIN_PERSON_CANDIDATES,
  chooseThreshold,
  trainingSource,
} from '../domain/calibration';

type Example = { chapter: string; x: Float32Array; y: number };

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const ctx = await loadVoteContext(prisma as unknown as PrismaService);
  const labels = await prisma.capLabel.findMany();
  const codes = [...new Set(labels.map((l) => l.capCode))].sort(
    (a, b) => +a - +b,
  );
  const index = new Map(codes.map((c, i) => [c, i]));
  const key = (l: {
    candidateId: string;
    documentUrl: string;
    heading: string;
    fromPosition: number | null;
  }) =>
    `${l.candidateId}\n${l.documentUrl}\n${l.heading}\n${l.fromPosition ?? ''}`;
  const chapterOf = (l: { candidateId: string; heading: string }) =>
    `${l.candidateId}\n${l.heading}`;

  // L'entraînement : tout ce qui est affiché (rangé par le vote ou validé).
  const shown = labels.filter(
    (l) =>
      l.status === LabelStatus.proposed || l.status === LabelStatus.validated,
  );
  const trainSet: Example[] = shown.flatMap((l) => {
    const x = ctx.vectorOf(ctx.blockOf(l));
    return x ? [{ chapter: chapterOf(l), x, y: index.get(l.capCode)! }] : [];
  });

  // Le test : les blocs dont une personne (jamais un assistant) a validé le
  // sujet, avec la réponse du modèle d'origine.
  const modelAt = new Map(
    labels
      .filter((l) => l.origin === LabelOrigin.model)
      .map((l) => [key(l), l.capCode]),
  );
  const truth = labels.flatMap((l) => {
    if (
      l.decisionMode !== DecisionMode.person ||
      l.status !== LabelStatus.validated
    )
      return [];
    // La réponse d'origine de Qwen, quand ce rangement venait de lui.
    const model = modelAt.get(key(l)) ?? null;
    const x = ctx.vectorOf(ctx.blockOf(l));
    return x ? [{ chapter: chapterOf(l), x, right: l.capCode, model }] : [];
  });
  if (truth.length < MIN_TRUTH) {
    console.log(
      `Seulement ${truth.length} blocs validés par une personne : il en faut au moins ${MIN_TRUTH} pour mesurer. Passez par les cartes de vérification.`,
    );
    process.exit(0);
  }
  // Assez de verdicts de personnes, sur assez de candidats : le classeur
  // n'apprend plus que sur eux. Sinon, sur tout ce qui est affiché.
  const persons = labels.filter(
    (l) =>
      l.decisionMode === DecisionMode.person &&
      l.status === LabelStatus.validated,
  );
  const source = trainingSource(
    persons.length,
    new Set(persons.map((l) => l.candidateId)).size,
  );
  if (source === 'person') {
    trainSet.length = 0;
    for (const l of persons) {
      const x = ctx.vectorOf(ctx.blockOf(l));
      if (x)
        trainSet.push({ chapter: chapterOf(l), x, y: index.get(l.capCode)! });
    }
  }
  console.log(
    source === 'person'
      ? 'Apprentissage sur les seuls verdicts de personnes.'
      : 'Apprentissage sur tous les rangements affichés : pas encore assez de verdicts de personnes.',
  );
  const dim = trainSet[0].x.length;
  console.log(
    `Entraînement sur ${trainSet.length} blocs affichés, test sur ${truth.length} blocs relus, ${codes.length} sujets, vecteurs de ${dim} nombres.`,
  );

  // Validation croisée en 5 parts, par chapitre : un chapitre testé n'est
  // jamais dans l'entraînement.
  const chapters = [...new Set(truth.map((t) => t.chapter))];
  for (let i = chapters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chapters[i], chapters[j]] = [chapters[j], chapters[i]];
  }
  const fold = new Map(chapters.map((c, i) => [c, i % 5]));
  const results: {
    right: string;
    model: string | null;
    got: string;
    margin: number;
    pRight: number;
  }[] = [];
  for (let f = 0; f < 5; f++) {
    const test = truth.filter((t) => fold.get(t.chapter) === f);
    const testChapters = new Set(test.map((t) => t.chapter));
    const t0 = Date.now();
    // Le vrai classeur du rangement (domain/softmax.ts), pas une copie.
    const predict = trainSoftmax(
      trainSet
        .filter((e) => !testChapters.has(e.chapter))
        .map((e) => ({ x: e.x, y: e.y })),
      codes.length,
    );
    for (const t of test) {
      const { k, p, probabilities } = predict(t.x);
      const y = index.get(t.right);
      results.push({
        right: t.right,
        model: t.model,
        got: codes[k],
        margin: p,
        pRight: y === undefined ? 0 : probabilities[y],
      });
    }
    console.log(
      `  part ${f + 1}/5 : appris en ${((Date.now() - t0) / 1000).toFixed(1)} s, ${test.length} blocs testés`,
    );
  }
  const pct = (a: number, b: number) =>
    `${a}/${b} = ${Math.round((100 * a) / b)} % (±${Math.round(196 * Math.sqrt(((a / b) * (1 - a / b)) / b))})`;
  const n = results.length;
  console.log(`\nSur ${n} blocs relus jamais vus à l'entraînement :`);
  console.log(
    `  classeur appris sur les vecteurs : ${pct(results.filter((r) => r.got === r.right).length, n)}`,
  );
  console.log(
    `  réponse d'origine du rangement   : ${pct(results.filter((r) => r.model === r.right).length, results.filter((r) => r.model !== null).length)}`,
  );
  const agree = results.filter((r) => r.got === r.model);
  console.log(
    `  classeur et Qwen3 d'accord        : ${pct(agree.filter((r) => r.got === r.right).length, agree.length)} · ${Math.round((100 * agree.length) / n)} % des blocs`,
  );
  for (const cut of [0.5, 0.6, 0.7, 0.8, 0.9]) {
    const sure = results.filter((r) => r.margin >= cut);
    console.log(
      `  classeur seul, confiance ≥ ${cut} : ${pct(sure.filter((r) => r.got === r.right).length, sure.length)} · ${Math.round((100 * sure.length) / n)} % des blocs`,
    );
  }
  const ce =
    results.reduce((s, r) => s - Math.log(Math.max(1e-12, r.pRight)), 0) /
    results.length;
  console.log(
    `  entropie croisée                 : ${ce.toFixed(2)} (au hasard : ${Math.log(codes.length).toFixed(2)})`,
  );
  // Le seuil mesuré, enregistré : le rangement suivant le prendra.
  const calibrated = chooseThreshold(
    results.map((r) => ({ confidence: r.margin, right: r.got === r.right })),
  );
  console.log(
    calibrated
      ? `\nSeuil mesuré : ${calibrated.threshold} (${calibrated.right}/${calibrated.total} justes, au moins ${Math.round(calibrated.low * 100)} %).`
      : '\nAucun seuil assez juste : le classeur ne rangera pas seul.',
  );
  // Une mesure sur trop peu de candidats ne fixe rien : elle dirait la
  // justesse sur leurs tournures, pas sur les sujets.
  const tested = new Set(truth.map((t) => t.chapter.split('\n')[0])).size;
  if (tested < MIN_PERSON_CANDIDATES)
    console.log(
      `Mesure non enregistrée : ${tested} candidat(s) vérifié(s), il en faut ${MIN_PERSON_CANDIDATES}.`,
    );
  else if (!process.argv.includes('--dry'))
    await prisma.classifierCalibration.create({
      data: {
        source,
        chapters: new Set(truth.map((t) => t.chapter)).size,
        candidates: new Set(truth.map((t) => t.chapter.split('\n')[0])).size,
        threshold: calibrated?.threshold ?? null,
        right: calibrated?.right ?? null,
        total: calibrated?.total ?? null,
        low: calibrated?.low ?? null,
        results: {
          right: results.filter((r) => r.got === r.right).length,
          total: results.length,
          // L'entropie croisée sur vos cartes : − log p(bon sujet), en
          // moyenne ; au hasard, log(nombre de sujets).
          crossEntropy: ce,
          crossEntropyRandom: Math.log(codes.length),
          // Par sujet : combien de chapitres, la précision (quand il dit ce
          // sujet, a-t-il raison ?) et le rappel (trouve-t-il ce sujet ?).
          subjects: codes
            .map((code) => {
              const truthOf = results.filter((r) => r.right === code);
              const said = results.filter((r) => r.got === code);
              const hit = truthOf.filter((r) => r.got === code).length;
              return {
                code,
                support: truthOf.length,
                precision: said.length ? hit / said.length : null,
                recall: truthOf.length ? hit / truthOf.length : null,
              };
            })
            .filter((x) => x.support > 0),
          // Les confusions les plus fréquentes : le bon sujet, et celui donné.
          confusions: [
            ...results
              .filter((r) => r.got !== r.right)
              .reduce((m, r) => {
                const k = `${r.right}>${r.got}`;
                m.set(k, (m.get(k) ?? 0) + 1);
                return m;
              }, new Map<string, number>()),
          ]
            .sort((x, y) => y[1] - x[1])
            .slice(0, 8)
            .map(([k, count]) => {
              const [right, got] = k.split('>');
              return { right, got, count };
            }),
          thresholds: [0.5, 0.6, 0.7, 0.8, 0.9].map((cut) => {
            const kept = results.filter((r) => r.margin >= cut);
            return {
              threshold: cut,
              right: kept.filter((r) => r.got === r.right).length,
              total: kept.length,
              coverage: kept.length / results.length,
            };
          }),
        },
      },
    });
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
