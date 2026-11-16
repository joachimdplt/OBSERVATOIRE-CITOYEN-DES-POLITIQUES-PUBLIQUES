import { createHash } from 'node:crypto';
import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { isVagueHeading } from '../../../domain/cap';
import type { Correction } from '../../../domain/corrections';
import { documentName } from '../../../domain/programme-reading';
import { trainSoftmax } from '../../../domain/softmax';
import { DEFAULT_SURE, trainingSource } from '../../../domain/calibration';
import {
  cosine,
  nearestTopic,
  vote,
  type Proposal,
} from '../../../domain/vote';
import {
  EMBEDDING_MODEL,
  embedMissingPassages,
  embedTexts,
  loadVoteContext,
} from '../../../common/subject-vectors';
import {
  currentCaptures,
  isSiteSidebar,
  isTestimonyChapter,
  withoutTestimonies,
} from '../../../domain/programme';
import {
  DocumentKind,
  LabelOrigin,
  LabelStatus,
  DecisionMode,
} from '../../../generated/prisma/enums';
import {
  TOPIC_CLASSIFIER,
  type TopicClassifier,
} from '../../../ports/topic-classifier';
import { PrismaService } from '../../../prisma/prisma.service';

/** Le texte d'un chapitre donné au classeur : son titre et son début. */
const CHAPTER_TEXT = 1500;
/** Ce que lit le modèle quand les voix ne s'accordent pas : moins, plus vite. */
const FAST_EXAMPLES = 3;
/** La confiance au-delà de laquelle le classeur range seul. */
const FAST_TEXT = 800;
/** Un chapitre d'au moins tant de passages parle de plusieurs sujets. */
const LONG_CHAPTER = 15;
/** Il se range alors par blocs d'autant de passages, chacun pour soi. */
const BLOCK = 8;

/**
 * Le rangement automatique : chaque chapitre des programmes en vigueur (son
 * document et son titre exact) reçoit le grand sujet CAP que le classeur
 * choisit ; un chapitre au titre vague (« Avant-propos ») n'est pas rangé. Un chapitre déjà rangé, ou dont le rangement a été retiré, n'est
 * pas rangé de nouveau.
 */
@Controller('admin/subjects')
@UseGuards(SessionGuard)
@Requires('preprint')
export class SuggestCapLabelsController {
  constructor(
    private prisma: PrismaService,
    @Inject(TOPIC_CLASSIFIER) private classifier: TopicClassifier,
  ) {}

  @Post('suggest')
  @HttpCode(200)
  suggest() {
    return suggestCapLabels(this.prisma, this.classifier);
  }
}

/** Le geste des propositions, appelé par l'administration ou en ligne de commande. */
export async function suggestCapLabels(
  prisma: PrismaService,
  classifier: TopicClassifier,
  /** Le suivi, ligne par ligne, en ligne de commande. */
  log: (line: string) => void = () => {},
) {
  const all = await prisma.capTopic.findMany();
  if (all.length === 0)
    throw new Error('La grille CAP n’est pas importée (npm run cap:import).');
  const byCode = (a: { code: string }, b: { code: string }) =>
    Number(a.code) - Number(b.code);
  const grid = all
    .filter((t) => t.level === 1)
    .sort(byCode)
    .map((t) => ({
      code: t.code,
      title: t.title,
      label: t.labelFr,
      subtopics: all
        .filter((x) => x.majorCode === t.code)
        .sort(byCode)
        .map((x) => ({
          code: x.code,
          title: x.title,
          label: x.labelFr,
          description: x.description,
        })),
    }));

  // Les documents de programme en vigueur, chacun dans sa dernière version.
  const documents = await prisma.politicalDocument.findMany({
    where: {
      kind: DocumentKind.programme,
      sourceRef: { not: null },
      retiredAt: null,
      candidateId: { not: null },
    },
    select: {
      id: true,
      sourceRef: true,
      fetchedAt: true,
      createdAt: true,
      candidateId: true,
      title: true,
      url: true,
    },
  });
  const current = currentCaptures(
    documents.map((d) => ({
      id: d.id,
      sourceRef: d.sourceRef!,
      fetchedAt: d.fetchedAt ?? d.createdAt,
    })),
  );
  const live = documents.filter((d) => current.has(d.id));
  const measures = await prisma.measure.findMany({
    where: { documentId: { in: live.map((d) => d.id) } },
    select: { documentId: true, article: true, quote: true, position: true },
    orderBy: { position: 'asc' },
  });

  // Les chapitres : un document et un titre ; un passage sans titre propre
  // ou une ligne de sommaire ne fait pas un chapitre.
  const docOf = new Map(live.map((d) => [d.id, d]));
  // D'abord chaque chapitre et ses passages, dans l'ordre.
  const grouped = new Map<
    string,
    {
      candidateId: string;
      documentUrl: string;
      heading: string;
      passages: { quote: string; position: number }[];
    }
  >();
  for (const m of measures) {
    const d = docOf.get(m.documentId)!;
    const heading = m.article.trim();
    if (!heading || heading === d.title) continue;
    if (isVagueHeading(heading) || isSiteSidebar(heading)) continue;
    const key = `${d.candidateId}\n${d.url}\n${heading}`;
    const g = grouped.get(key) ?? {
      candidateId: d.candidateId!,
      documentUrl: d.url ?? '',
      heading,
      passages: [],
    };
    g.passages.push({ quote: m.quote, position: m.position ?? 0 });
    grouped.set(key, g);
  }
  // Les témoignages signés ne sont pas les mots du candidat.
  for (const [key, g] of grouped) {
    g.passages = withoutTestimonies(g.passages, (p) => p.quote);
    if (isTestimonyChapter(g.heading, g.passages[0]?.quote ?? ''))
      grouped.delete(key);
  }

  // Les corrections de l'équipe : chaque chapitre ou bloc rangé à la main
  // par une personne (jamais par un assistant), avec son texte et sa raison. Le modèle voit les plus proches de chaque
  // extrait avant de le ranger, et ne refait pas une erreur déjà corrigée.
  const corrections: Correction[] = (
    await prisma.capLabel.findMany({
      where: {
        decisionMode: DecisionMode.person,
        status: LabelStatus.validated,
      },
      select: {
        candidateId: true,
        documentUrl: true,
        heading: true,
        fromPosition: true,
        capCode: true,
        reason: true,
      },
    })
  ).flatMap((l) => {
    const g = grouped.get(`${l.candidateId}\n${l.documentUrl}\n${l.heading}`);
    if (!g) return [];
    const from = l.fromPosition;
    const passages = g.passages.filter(
      (p) => from === null || p.position >= from,
    );
    return [
      {
        text: [g.heading, ...passages.slice(0, 3).map((p) => p.quote)].join(
          '\n',
        ),
        code: l.capCode,
        reason: l.reason,
      },
    ];
  });

  // Puis les unités à ranger : un chapitre entier, ou, s'il est long, chacun
  // de ses blocs ; un long chapitre peut ainsi entrer dans plusieurs sujets.
  const chapters = new Map<
    string,
    {
      candidateId: string;
      documentUrl: string;
      heading: string;
      fromPosition: number | null;
      text: string;
    }
  >();
  for (const g of grouped.values()) {
    const long = g.passages.length >= LONG_CHAPTER;
    const blocks = long
      ? Array.from({ length: Math.ceil(g.passages.length / BLOCK) }, (_, i) =>
          g.passages.slice(i * BLOCK, (i + 1) * BLOCK),
        )
      : [g.passages];
    for (const block of blocks) {
      const fromPosition = long ? block[0].position : null;
      const id = createHash('sha256')
        .update(
          `${g.candidateId}\n${g.documentUrl}\n${g.heading}\n${fromPosition ?? ''}`,
        )
        .digest('hex')
        .slice(0, 24);
      let text = g.heading;
      for (const p of block) {
        if (text.length >= CHAPTER_TEXT) break;
        text = `${text}\n${p.quote}`;
      }
      chapters.set(id, { ...g, fromPosition, text });
    }
  }

  // Une unité déjà rangée n'est pas reproposée : un chapitre entier par son
  // titre, un bloc par son titre et son premier passage.
  const labels = await prisma.capLabel.findMany({
    select: {
      candidateId: true,
      documentUrl: true,
      heading: true,
      fromPosition: true,
    },
  });
  const labelled = new Set(
    labels.map(
      (l) =>
        `${l.candidateId}\n${l.documentUrl}\n${l.heading}\n${l.fromPosition ?? ''}`,
    ),
  );
  const filed = new Set(
    (await prisma.filedUnit.findMany({ select: { id: true } })).map(
      (u) => u.id,
    ),
  );
  const todo = [...chapters.entries()].filter(
    ([id, c]) =>
      !filed.has(id) &&
      !labelled.has(
        `${c.candidateId}\n${c.documentUrl}\n${c.heading}\n${c.fromPosition ?? ''}`,
      ),
  );
  const report = { chapters: chapters.size, proposed: 0, review: 0, model: '' };
  if (todo.length === 0) return report;

  report.model = classifier.model;
  const names = new Map(
    (await prisma.candidate.findMany({ select: { id: true, name: true } })).map(
      (c) => [c.id, c.name],
    ),
  );
  const labelOf = new Map(grid.map((t) => [t.code, t.label]));
  const started = Date.now();
  log(
    `${todo.length} unités à ranger sur ${chapters.size} (modèle ${classifier.model})`,
  );
  // Une unité à la fois, enregistrée aussitôt : une coupure ne fait rien
  // perdre, et une relance reprend où elle s'était arrêtée.
  // Le vote : chaque unité est aussi rangée par la grille, les voisins et
  // le classement du candidat ; le modèle ne range seul que si une autre
  // voix est d'accord avec lui, sinon l'unité part en relecture.
  await embedMissingPassages(prisma, log);
  const ctx = await loadVoteContext(prisma);
  const titles = new Map(
    (
      await prisma.politicalDocument.findMany({
        where: {
          url: { in: [...new Set(todo.map(([, c]) => c.documentUrl))] },
        },
        select: { url: true, title: true },
      })
    ).map((d) => [d.url, documentName(d.title)]),
  );
  const titleTopic = new Map<string, string | null>();
  const topicOfTitle = async (text: string) => {
    if (!titleTopic.has(text)) {
      const [v] = await embedTexts([text]);
      titleTopic.set(text, nearestTopic(v, ctx.topicVectors));
    }
    return titleTopic.get(text) ?? null;
  };
  // Les corrections de l'équipe, avec le sens de leur bloc : le modèle voit
  // les plus proches par le sens.
  const personLabels = await prisma.capLabel.findMany({
    where: {
      decisionMode: DecisionMode.person,
      status: LabelStatus.validated,
    },
  });
  const correctionVectors = personLabels.flatMap((l) => {
    const v = ctx.vectorOf(ctx.blockOf(l));
    const g = grouped.get(`${l.candidateId}\n${l.documentUrl}\n${l.heading}`);
    if (!v || !g) return [];
    const passages = g.passages.filter(
      (p) => l.fromPosition === null || p.position >= l.fromPosition,
    );
    const c: Correction = {
      text: [g.heading, ...passages.slice(0, 3).map((p) => p.quote)].join('\n'),
      code: l.capCode,
      reason: l.reason,
    };
    return [{ c, v }];
  });
  report.review = 0;

  // Le classeur appris sur les vecteurs, réentraîné à chaque rangement. Il
  // apprend sur les seuls verdicts de personnes quand il y en a assez, sur
  // assez de candidats ; sinon sur tout ce qui est affiché.
  const personWhere = {
    decisionMode: DecisionMode.person,
    status: LabelStatus.validated,
  };
  const persons = await prisma.capLabel.findMany({
    where: personWhere,
    select: { candidateId: true },
  });
  const source = trainingSource(
    persons.length,
    new Set(persons.map((p) => p.candidateId)).size,
  );
  const shownLabels = await prisma.capLabel.findMany({
    where:
      source === 'person'
        ? personWhere
        : { status: { in: [LabelStatus.proposed, LabelStatus.validated] } },
  });
  // Le seuil du classeur sûr de lui : la dernière mesure sur des verdicts
  // de personnes ; sans mesure, le seuil par défaut. Une mesure sans seuil
  // assez juste veut dire : le classeur ne range jamais seul.
  const calibration = await prisma.classifierCalibration.findFirst({
    orderBy: { measuredAt: 'desc' },
  });
  const sureAt = calibration
    ? (calibration.threshold ?? Infinity)
    : DEFAULT_SURE;
  log(
    calibration
      ? `Seuil du classeur : ${sureAt === Infinity ? 'aucun (ne range jamais seul)' : sureAt}, mesuré le ${calibration.measuredAt.toISOString().slice(0, 10)} sur ${calibration.chapters} chapitres vérifiés.`
      : `Seuil du classeur : ${DEFAULT_SURE}, par défaut (pas encore mesuré sur des verdicts de personnes).`,
  );
  const classCodes = grid.map((t) => t.code);
  const classOf = new Map(classCodes.map((code, i) => [code, i]));
  const examples = shownLabels.flatMap((l) => {
    const x = ctx.vectorOf(ctx.blockOf(l));
    const y = classOf.get(l.capCode);
    return x && y !== undefined ? [{ x, y }] : [];
  });
  log(
    `Apprentissage du classeur sur ${examples.length} blocs ${source === 'person' ? 'vérifiés par une personne' : 'affichés'}…`,
  );
  const classify = trainSoftmax(examples, classCodes.length);

  for (let i = 0; i < todo.length; i += 1) {
    const [id, c] = todo[i];
    const v = ctx.vectorOf(ctx.blockOf(c));
    const guess = v ? classify(v) : null;
    const title = titles.get(c.documentUrl) ?? '';
    const voices: Proposal[] = [
      { method: 'grille', code: v ? nearestTopic(v, ctx.topicVectors) : null },
      {
        method: 'classeur',
        code: guess ? classCodes[guess.k] : null,
        ...(guess ? { p: guess.p } : {}),
      },
      { method: 'titre', code: await topicOfTitle(title) },
      {
        method: 'rubrique',
        code: await topicOfTitle(`${title} — ${c.heading}`),
      },
    ];
    // Le mode rapide, sans le modèle de langue :
    // - le classeur très sûr de lui (confiance ≥ 0,7 : juste 96 fois sur
    //   100, ±5, sur 150 blocs relus jamais vus) ;
    // - ou la grille, le classeur et le classement du candidat d'accord.
    // Le modèle n'est interrogé que sinon.
    const [grille, classeur, titre, rubrique] = voices.map((p) => p.code);
    const sure = guess !== null && guess.p >= sureAt;
    const quick =
      sure ||
      (grille !== null &&
        grille === classeur &&
        (titre === grille || rubrique === grille));
    let model: string | null = null;
    if (!quick) {
      const pick = v
        ? () =>
            correctionVectors
              .map((x) => ({ c: x.c, s: cosine(v, x.v) }))
              .sort((a, b) => b.s - a.s)
              .slice(0, FAST_EXAMPLES)
              .map((x) => x.c)
        : undefined;
      const [choice] = await classifier.classify(
        grid,
        [{ id, text: c.text.slice(0, FAST_TEXT) }],
        corrections,
        pick,
      );
      model = choice?.code ?? null;
    }
    const proposals: Proposal[] = [
      ...voices.slice(0, 2),
      { method: 'modele', code: model },
      ...voices.slice(2),
    ];
    const code = quick ? classeur : model;
    const agreed = quick || vote(proposals).agreed;
    const done = i + 1;
    const left = Math.round(
      (((Date.now() - started) / done) * (todo.length - done)) / 60000,
    );
    log(
      `[${done}/${todo.length}, encore ~${left} min] ${names.get(c.candidateId) ?? '?'} · ${c.heading.slice(0, 55)}${c.fromPosition !== null ? ` (bloc ${c.fromPosition})` : ''} → ${code ? labelOf.get(code) : 'aucun'} ${sure ? `(classeur sûr à ${Math.round(guess.p * 100)} %)` : quick ? '(accord des voix, sans modèle)' : agreed ? '(vote d’accord)' : '(à relire)'}`,
    );
    // Le morceau est noté comme rangé, quel que soit le résultat.
    await prisma.filedUnit.upsert({
      where: { id },
      create: { id },
      update: {},
    });
    if (!code) continue;
    if (!agreed) report.review++;
    await prisma.capLabel.createMany({
      data: [
        {
          candidateId: c.candidateId,
          documentUrl: c.documentUrl,
          heading: c.heading,
          fromPosition: c.fromPosition,
          capCode: code,
          origin: LabelOrigin.model,
          model: quick ? EMBEDDING_MODEL : classifier.model,
          proposals,
          status: agreed ? LabelStatus.proposed : LabelStatus.review,
        },
      ],
      skipDuplicates: true,
    });
    report.proposed++;
  }
  return report;
}
