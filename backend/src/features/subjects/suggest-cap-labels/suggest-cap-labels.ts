import {
  earlierDuplicates,
  isCardTotal,
  relink,
  sameText,
  type ReadPassage,
} from '../../../domain/relink';
import { TOOL_ACCOUNT_ID } from '../../../domain/tool-account';
import { liveProgrammes } from '../../../common/live-programmes';
import {
  CHAPTER,
  NO_TOPIC,
  inLabel,
  continuesSentence,
  isCampaignLogistics,
  isEnumeratedChapter,
  isMeasureList,
  spansSeveralTopics,
  PASSAGE_FILING,
  passageUnit,
} from '../../../domain/filing-unit';
import { createHash } from 'node:crypto';
import {
  ConflictException,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  isSiteSidebar,
  isTestimonyChapter,
  withoutTestimonies,
} from '../../../domain/programme';
import {
  CheckVerdict,
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
/** La confiance du classeur pour compter une mesure dans un sujet, quand on
 * regarde si une liste change de sujet. */
const LIST_SURE = 0.5;
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

  private running = false;

  /** Ranger les chapitres nouveaux, depuis l'administration. Un seul
   * rangement à la fois : le classeur et Qwen tournent sur la même machine. */
  @Post('suggest')
  @HttpCode(200)
  async suggest() {
    if (this.running)
      throw new ConflictException('Un rangement est déjà en cours.');
    this.running = true;
    try {
      return await suggestCapLabels(this.prisma, this.classifier);
    } finally {
      this.running = false;
    }
  }
}

/** Le geste des propositions, appelé par l'administration ou en ligne de commande. */
export async function suggestCapLabels(
  prisma: PrismaService,
  classifier: TopicClassifier,
  /** Le suivi, ligne par ligne, en ligne de commande. */
  log: (line: string) => void = () => {},
  /** Les candidats à reranger en entier (slugs) : chaque unité repasse par
   * le modèle et sa consigne, sauf celles qu'une personne a vérifiées. */
  options: { refile?: string[] } = {},
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
  const documents = await liveProgrammes(prisma, {
    where: { candidateId: { not: null } },
    select: {
      id: true,
      candidateId: true,
      title: true,
      url: true,
      fetchedAt: true,
      createdAt: true,
    },
  });
  const live = documents;
  const measures = await prisma.measure.findMany({
    where: { documentId: { in: live.map((d) => d.id) } },
    select: {
      documentId: true,
      article: true,
      quote: true,
      position: true,
      page: true,
    },
    orderBy: { position: 'asc' },
  });

  // Un rangement dont le chapitre a disparu à la relecture de son document
  // (un faux titre corrigé, un chapitre retiré par le candidat) n'a plus de
  // passages : il est retiré, avec sa raison, avant de ranger le nouveau.
  // Avant, chaque rangement d'un document relu suit ses passages, retrouvés
  // par leur texte : un titre corrigé ne fait pas perdre un verdict.
  const relinked = await followRereading(prisma, live, measures, log);
  const orphans = await retireOrphans(prisma, live, measures, log);

  // Les chapitres : un document et un titre ; un passage sans titre propre
  // ou une ligne de sommaire ne fait pas un chapitre.
  const docOf = new Map(live.map((d) => [d.id, d]));
  // Les candidats dont le texte suivi se range passage par passage : chaque
  // passage compte, même sans titre propre.
  const byPassage = new Set(
    (
      await prisma.candidate.findMany({
        where: { slug: { in: [...PASSAGE_FILING] } },
        select: { id: true },
      })
    ).map((c) => c.id),
  );
  const refileIds = new Set(
    options.refile?.length
      ? (
          await prisma.candidate.findMany({
            where: { slug: { in: options.refile } },
            select: { id: true },
          })
        ).map((c) => c.id)
      : [],
  );
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
  // Une mesure écrite deux fois dans un même document (un résumé, puis le
  // tableau détaillé) ne se range qu'une fois, à sa ligne du tableau.
  const duplicates = new Set<string>();
  const byDocument = new Map<
    string,
    { position: number; quote: string; page: number | null }[]
  >();
  for (const m of measures) {
    const list = byDocument.get(m.documentId) ?? [];
    list.push({ position: m.position ?? 0, quote: m.quote, page: m.page });
    byDocument.set(m.documentId, list);
  }
  for (const [doc, list] of byDocument)
    for (const position of earlierDuplicates(list))
      duplicates.add(`${doc}\n${position}`);
  await retireDuplicates(prisma, measures, duplicates, docOf, log);
  for (const m of measures) {
    if (duplicates.has(`${m.documentId}\n${m.position ?? 0}`)) continue;
    if (isCardTotal(m.quote, m.article)) continue;
    const d = docOf.get(m.documentId)!;
    const passageWise = byPassage.has(d.candidateId!);
    const heading = m.article.trim() || (passageWise ? d.title.trim() : '');
    if (!heading) continue;
    // Dans un PDF, un passage sans titre de chapitre reprend le nom du
    // fichier : il n'a pas de chapitre à ranger. Sur un site, une page par
    // mesure a pour titre celui de la mesure : c'est son chapitre.
    if (
      !passageWise &&
      ((heading === d.title && /\.pdf(\?|#|$)/i.test(d.url ?? '')) ||
        isVagueHeading(heading) ||
        isSiteSidebar(heading))
    )
      continue;
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
        positions: true,
        capCode: true,
        reason: true,
      },
    })
  ).flatMap((l) => {
    const g = grouped.get(`${l.candidateId}\n${l.documentUrl}\n${l.heading}`);
    if (!g) return [];
    const passages = g.passages.filter((p) => inLabel(l, p.position));
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
      unit: string;
      positions: number[];
      text: string;
    }
  >();
  const splitChapters = new Set<string>();
  const chapterKey = (g: {
    candidateId: string;
    documentUrl: string;
    heading: string;
  }) => `${g.candidateId}\n${g.documentUrl}\n${g.heading}`;
  // Chaque passage d'un chapitre devient une unité, rangée seule.
  // Les fragments joints à leur passage : position du fragment → position
  // du passage qui le porte.
  const joined = new Map<string, number>();
  const addPassages = (
    g: typeof grouped extends Map<string, infer G> ? G : never,
  ) => {
    let last: { id: string; position: number } | null = null;
    for (const p of g.passages) {
      // La suite d'une phrase coupée par une colonne ou une page (elle
      // commence en minuscule) se range avec le passage qui la précède.
      if (last && continuesSentence(p.quote)) {
        const unit = chapters.get(last.id)!;
        unit.positions.push(p.position);
        unit.text = `${unit.text} ${p.quote}`.slice(0, CHAPTER_TEXT);
        joined.set(`${chapterKey(g)}\n${p.position}`, last.position);
        continue;
      }
      if (isCampaignLogistics(p.quote)) {
        last = null;
        continue;
      }
      const unit = passageUnit(p.position);
      const id = createHash('sha256')
        .update(`${g.candidateId}\n${g.documentUrl}\n${g.heading}\n${unit}`)
        .digest('hex')
        .slice(0, 24);
      chapters.set(id, {
        ...g,
        fromPosition: p.position,
        unit,
        positions: [p.position],
        text: `${g.heading}\n${p.quote}`.slice(0, CHAPTER_TEXT),
      });
      last = { id, position: p.position };
    }
  };
  // Un chapitre dont un rangement a été validé par une personne n'est
  // jamais découpé : sa décision prime.
  const humanChapters = new Set(
    (
      await prisma.capLabel.findMany({
        where: {
          unit: CHAPTER,
          status: LabelStatus.validated,
          OR: [
            { decisionMode: DecisionMode.person },
            { checks: { some: { verdict: CheckVerdict.accepted } } },
          ],
        },
        select: { candidateId: true, documentUrl: true, heading: true },
      })
    ).map(chapterKey),
  );
  // Une liste déjà découpée (des rangements passage par passage existent)
  // le reste.
  const alreadySplit = new Set(
    (
      await prisma.capLabel.findMany({
        where: {
          unit: { startsWith: 'passage:' },
          candidateId: { notIn: [...byPassage] },
        },
        select: { candidateId: true, documentUrl: true, heading: true },
      })
    ).map(chapterKey),
  );
  for (const g of grouped.values()) {
    // Un texte suivi : chaque passage est une unité, rangée seule.
    // Un chapitre de propositions numérotées se range aussi passage par
    // passage : chaque proposition peut avoir son sujet.
    const enumerated =
      !byPassage.has(g.candidateId) &&
      !humanChapters.has(chapterKey(g)) &&
      isEnumeratedChapter(g.passages.map((p) => p.quote));
    if (enumerated) splitChapters.add(chapterKey(g));
    if (
      byPassage.has(g.candidateId) ||
      enumerated ||
      alreadySplit.has(chapterKey(g))
    ) {
      addPassages(g);
      continue;
    }
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
      chapters.set(id, {
        ...g,
        fromPosition,
        unit: CHAPTER,
        positions: [],
        text,
      });
    }
  }

  await retireSplitChapters(
    prisma,
    splitChapters,
    'Chapitre de propositions numérotées : rangé proposition par proposition.',
    log,
  );
  await joinFragments(prisma, chapters, joined, log);

  // Une unité déjà rangée n'est pas reproposée : un chapitre entier par son
  // titre, un bloc par son titre et son premier passage.
  const labels = await prisma.capLabel.findMany({
    select: {
      candidateId: true,
      documentUrl: true,
      heading: true,
      fromPosition: true,
      unit: true,
    },
  });
  const labelled = new Set(
    labels.map(
      (l) =>
        `${l.candidateId}\n${l.documentUrl}\n${l.heading}\n${l.fromPosition ?? ''}\n${l.unit}`,
    ),
  );
  const filed = new Set(
    (await prisma.filedUnit.findMany({ select: { id: true } })).map(
      (u) => u.id,
    ),
  );
  // Au rerangement, une unité qu'une personne a vérifiée ou décidée garde
  // son rangement ; toutes les autres repassent.
  const unitKey = (l: {
    candidateId: string;
    documentUrl: string;
    heading: string;
    unit: string;
  }) => `${l.candidateId}\n${l.documentUrl}\n${l.heading}\n${l.unit}`;
  const machineLabels =
    refileIds.size > 0
      ? await prisma.capLabel.findMany({
          where: { candidateId: { in: [...refileIds] } },
          select: {
            id: true,
            candidateId: true,
            documentUrl: true,
            heading: true,
            unit: true,
            capCode: true,
            status: true,
            decisionMode: true,
            _count: { select: { checks: true } },
          },
        })
      : [];
  const byPerson = (l: (typeof machineLabels)[number]) =>
    l._count.checks > 0 || l.decisionMode === DecisionMode.person;
  const protectedUnits = new Set(machineLabels.filter(byPerson).map(unitKey));
  let todo = [...chapters.entries()].filter(([id, c]) =>
    refileIds.has(c.candidateId)
      ? !protectedUnits.has(unitKey(c))
      : !filed.has(id) &&
        !labelled.has(
          `${c.candidateId}\n${c.documentUrl}\n${c.heading}\n${c.fromPosition ?? ''}\n${c.unit}`,
        ),
  );
  const report = {
    chapters: chapters.size,
    proposed: 0,
    review: 0,
    /** Au rerangement : les unités dont le sujet n'a pas changé. */
    kept: 0,
    /** Les rangements qui ont suivi leurs passages sous un nouveau titre. */
    relinked,
    orphans,
    model: '',
  };

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
    const passages = g.passages.filter((p) => inLabel(l, p.position));
    const c: Correction = {
      text: [g.heading, ...passages.slice(0, 3).map((p) => p.quote)].join('\n'),
      code: l.capCode,
      reason: l.reason,
    };
    return [{ c, v }];
  });
  // Les contre-exemples : les passages que l'équipe a jugés sans sujet de
  // politique publique, ou pas une position du candidat, avec leur
  // explication. Le modèle les voit comme les corrections ; un passage dont
  // le plus proche voisin en est un passe toujours par le modèle.
  const setAside = (
    await prisma.capLabel.findMany({
      where: { checks: { some: {} } },
      include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 } },
    })
  ).filter(
    (l) =>
      l.checks[0]?.verdict === CheckVerdict.no_topic ||
      l.checks[0]?.verdict === CheckVerdict.dismissed,
  );
  // Et ceux écartés dans « À trancher » sans autre sujet : refusés par une
  // personne, sans rangement validé pour la même unité.
  const unitOf = (l: {
    candidateId: string;
    documentUrl: string;
    heading: string;
    unit: string;
  }) => `${l.candidateId}\n${l.documentUrl}\n${l.heading}\n${l.unit}`;
  const filedUnits = new Set(personLabels.map(unitOf));
  const dropped = (
    await prisma.capLabel.findMany({
      where: {
        status: LabelStatus.rejected,
        decisionMode: DecisionMode.person,
        origin: LabelOrigin.model,
        reason: { not: null },
        checks: { none: {} },
      },
    })
  ).filter((l) => !filedUnits.has(unitOf(l)));
  setAside.push(...dropped.map((l) => ({ ...l, checks: [] })));
  for (const l of setAside) {
    const v = ctx.vectorOf(ctx.blockOf(l));
    const g = grouped.get(`${l.candidateId}\n${l.documentUrl}\n${l.heading}`);
    if (!v || !g) continue;
    const passages = g.passages.filter((p) => inLabel(l, p.position));
    correctionVectors.push({
      c: {
        text: passages
          .slice(0, 3)
          .map((p) => p.quote)
          .join('\n'),
        code: NO_TOPIC,
        reason: l.reason,
      },
      v,
    });
  }
  log(
    `${correctionVectors.length} exemples de l’équipe pour le modèle, dont ${setAside.length} sans sujet.`,
  );
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

  // Les listes de mesures qui changent de sujet : le classeur range chaque
  // mesure ; s'il y voit plusieurs sujets avec assurance, la liste est
  // rangée mesure par mesure. Une liste d'un seul sujet reste d'un bloc.
  // La règle est la même pour tous les candidats.
  const divergent = new Set<string>();
  for (const g of grouped.values()) {
    const key = chapterKey(g);
    if (
      byPassage.has(g.candidateId) ||
      splitChapters.has(key) ||
      alreadySplit.has(key) ||
      humanChapters.has(key) ||
      !isMeasureList(g.passages.map((p) => p.quote))
    )
      continue;
    const guesses = g.passages.map((p) => {
      const v = ctx.vectorOf(
        ctx.blockOf({
          documentUrl: g.documentUrl,
          heading: g.heading,
          fromPosition: p.position,
          positions: [p.position],
        }),
      );
      const r = v ? classify(v) : null;
      return r && r.p >= LIST_SURE ? classCodes[r.k] : null;
    });
    if (!spansSeveralTopics(guesses)) continue;
    divergent.add(key);
    addPassages(g);
  }
  if (divergent.size > 0) {
    await retireSplitChapters(
      prisma,
      divergent,
      'Liste de mesures de plusieurs sujets : rangée mesure par mesure.',
      log,
    );
    todo = todo.filter(
      ([, c]) => !(c.unit === CHAPTER && divergent.has(chapterKey(c))),
    );
    for (const [id, c] of chapters)
      if (
        c.unit !== CHAPTER &&
        divergent.has(chapterKey(c)) &&
        !filed.has(id) &&
        !labelled.has(
          `${c.candidateId}\n${c.documentUrl}\n${c.heading}\n${c.fromPosition ?? ''}\n${c.unit}`,
        )
      )
        todo.push([id, c]);
    for (const d of await prisma.politicalDocument.findMany({
      where: { url: { in: [...new Set(todo.map(([, c]) => c.documentUrl))] } },
      select: { url: true, title: true },
    }))
      if (d.url && !titles.has(d.url)) titles.set(d.url, documentName(d.title));
    log(
      `${divergent.size} listes de mesures de plusieurs sujets, rangées mesure par mesure.`,
    );
  }
  if (todo.length === 0) return report;

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
    // Au rerangement, le modèle lit chaque unité, avec sa consigne.
    const refiling = refileIds.has(c.candidateId);
    // Le plus proche des exemples de l'équipe est un passage sans sujet :
    // le classeur ne range pas seul, le modèle lit le passage.
    const nearest =
      v && correctionVectors.length > 0
        ? correctionVectors.reduce(
            (best, x) => {
              const s = cosine(v, x.v);
              return s > best.s ? { code: x.c.code, s } : best;
            },
            { code: '', s: -Infinity },
          )
        : null;
    const doubtful = nearest?.code === NO_TOPIC;
    const quick =
      !refiling &&
      !doubtful &&
      (sure ||
        (grille !== null &&
          grille === classeur &&
          (titre === grille || rubrique === grille)));
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
    // « Aucun sujet » n'est pas un sujet de la grille : le passage part en
    // relecture sous le sujet du classeur, et la personne tranche.
    const none = model === NO_TOPIC;
    const code = quick ? classeur : none ? (classeur ?? grille) : model;
    const agreed = !none && (quick || vote(proposals).agreed);
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
    if (refiling) {
      const outcome = await refileUnit(prisma, c, code, agreed, {
        labels: machineLabels.filter((l) => unitKey(l) === unitKey(c)),
        model: classifier.model,
        proposals,
      });
      if (outcome === 'kept') report.kept++;
      else if (outcome === 'changed') {
        report.proposed++;
        if (!agreed) report.review++;
      }
      continue;
    }
    // Un bloc d'un long chapitre qui retombe sur un sujet déjà rangé pour ce
    // chapitre ne crée rien : on ne compte que ce qui est vraiment écrit.
    const { count } = await prisma.capLabel.createMany({
      data: [
        {
          candidateId: c.candidateId,
          documentUrl: c.documentUrl,
          heading: c.heading,
          fromPosition: c.fromPosition,
          unit: c.unit,
          positions: c.positions,
          capCode: code,
          origin: LabelOrigin.model,
          model: quick ? EMBEDDING_MODEL : classifier.model,
          proposals,
          status: agreed ? LabelStatus.proposed : LabelStatus.review,
        },
      ],
      skipDuplicates: true,
    });
    if (count === 0) continue;
    if (!agreed) report.review++;
    report.proposed++;
  }
  return report;
}

/**
 * Rerange une unité d'un candidat : si son rangement actif porte déjà le
 * sujet choisi, rien ne change ; sinon le nouveau sujet est proposé et
 * l'ancien rangement est retiré, avec sa raison. Un sujet qu'une personne a
 * déjà écarté pour cette unité n'est pas reproposé.
 */
async function refileUnit(
  prisma: PrismaService,
  c: {
    candidateId: string;
    documentUrl: string;
    heading: string;
    fromPosition: number | null;
    unit: string;
    positions: number[];
  },
  code: string,
  agreed: boolean,
  ctx: {
    labels: {
      id: string;
      capCode: string;
      status: LabelStatus;
      decisionMode: DecisionMode | null;
    }[];
    model: string;
    proposals: Proposal[];
  },
): Promise<'kept' | 'changed' | 'skipped'> {
  const active = ctx.labels.filter((l) => l.status !== LabelStatus.rejected);
  if (active.some((l) => l.capCode === code)) return 'kept';
  const same = ctx.labels.find((l) => l.capCode === code);
  if (same && same.decisionMode === DecisionMode.person) return 'skipped';
  const status = agreed ? LabelStatus.proposed : LabelStatus.review;
  if (same)
    await prisma.capLabel.update({
      where: { id: same.id },
      data: {
        status,
        decidedById: null,
        decidedAt: null,
        decisionMode: null,
        reason: null,
        proposals: ctx.proposals,
        model: ctx.model,
      },
    });
  else
    await prisma.capLabel.create({
      data: {
        candidateId: c.candidateId,
        documentUrl: c.documentUrl,
        heading: c.heading,
        fromPosition: c.fromPosition,
        unit: c.unit,
        positions: c.positions,
        capCode: code,
        origin: LabelOrigin.model,
        model: ctx.model,
        proposals: ctx.proposals,
        status,
      },
    });
  if (active.length > 0)
    await prisma.capLabel.updateMany({
      where: { id: { in: active.map((l) => l.id) } },
      data: {
        status: LabelStatus.rejected,
        decidedById: TOOL_ACCOUNT_ID,
        decidedAt: new Date(),
        decisionMode: DecisionMode.assistant,
        reason:
          'Rerangé selon la règle de rangement : la politique visée, pas ses conséquences.',
      },
    });
  return 'changed';
}

/**
 * Un chapitre qui se range désormais passage par passage : son rangement
 * d'un bloc, s'il n'a été ni vérifié ni décidé par une personne, est
 * retiré ; un refus qui attendait son reclassement est fermé. Ses passages
 * sont rangés un à un ensuite. Un chapitre qui a un rangement validé par
 * une personne n'arrive jamais ici : il n'est pas découpé.
 */
async function retireSplitChapters(
  prisma: PrismaService,
  split: Set<string>,
  reason: string,
  log: (line: string) => void,
) {
  if (split.size === 0) return;
  const labels = (
    await prisma.capLabel.findMany({
      where: { unit: CHAPTER },
      select: {
        id: true,
        candidateId: true,
        documentUrl: true,
        heading: true,
        capCode: true,
        status: true,
        decisionMode: true,
        checks: { orderBy: { checkedAt: 'desc' }, take: 1 },
      },
    })
  ).filter((l) =>
    split.has(`${l.candidateId}\n${l.documentUrl}\n${l.heading}`),
  );
  const retire = labels.filter(
    (l) =>
      l.checks.length === 0 &&
      l.status !== LabelStatus.rejected &&
      l.decisionMode !== DecisionMode.person,
  );
  const close = labels.filter(
    (l) => l.checks[0]?.verdict === CheckVerdict.refused,
  );
  if (retire.length > 0)
    await prisma.capLabel.updateMany({
      where: { id: { in: retire.map((l) => l.id) } },
      data: {
        status: LabelStatus.rejected,
        decidedById: TOOL_ACCOUNT_ID,
        decidedAt: new Date(),
        decisionMode: DecisionMode.assistant,
        reason,
      },
    });
  if (close.length > 0)
    await prisma.labelCheck.createMany({
      data: close.map((l) => ({
        labelId: l.id,
        verdict: CheckVerdict.split,
        checkedById: TOOL_ACCOUNT_ID,
      })),
    });
  if (retire.length + close.length > 0)
    log(
      `${retire.length + close.length} rangements de chapitre remplacés par un rangement passage par passage.`,
    );
}

/**
 * Les rangements dont tous les passages sont des doublons d'une ligne plus
 * loin dans le même document : retirés s'ils n'ont été ni vérifiés ni
 * décidés par une personne ; la mesure se range à sa ligne du tableau.
 */
async function retireDuplicates(
  prisma: PrismaService,
  measures: {
    documentId: string;
    article: string;
    quote: string;
    position: number | null;
  }[],
  duplicates: Set<string>,
  docOf: Map<string, { url: string }>,
  log: (line: string) => void,
) {
  if (duplicates.size === 0) return;
  const docs = new Set([...duplicates].map((k) => k.split('\n')[0]));
  const urls = new Map([...docs].map((id) => [docOf.get(id)!.url, id]));
  const labels = await prisma.capLabel.findMany({
    where: {
      documentUrl: { in: [...urls.keys()] },
      status: { not: LabelStatus.rejected },
      checks: { none: {} },
      NOT: { decisionMode: DecisionMode.person },
    },
    select: {
      id: true,
      documentUrl: true,
      heading: true,
      fromPosition: true,
      positions: true,
    },
  });
  const gone = labels.filter((l) => {
    const doc = urls.get(l.documentUrl)!;
    const own = measures.filter(
      (m) =>
        m.documentId === doc &&
        m.article === l.heading &&
        inLabel(l, m.position),
    );
    return (
      own.length > 0 &&
      own.every(
        (m) =>
          duplicates.has(`${doc}\n${m.position ?? 0}`) ||
          isCardTotal(m.quote, m.article),
      )
    );
  });
  if (gone.length === 0) return;
  await prisma.capLabel.updateMany({
    where: { id: { in: gone.map((l) => l.id) } },
    data: {
      status: LabelStatus.rejected,
      decidedById: TOOL_ACCOUNT_ID,
      decidedAt: new Date(),
      decisionMode: DecisionMode.assistant,
      reason:
        'Mesure écrite deux fois dans le même document : rangée à sa ligne du tableau détaillé.',
    },
  });
  log(
    `${gone.length} rangements retirés : leurs mesures sont rangées à leur ligne du tableau.`,
  );
}

/**
 * Un fragment de phrase devenu un rangement à part (avant que les suites de
 * phrase ne soient jointes) : le rangement du passage qui le porte s'étend
 * au fragment, et le rangement du fragment seul, s'il n'a été ni vérifié ni
 * décidé par une personne, est retiré.
 */
async function joinFragments(
  prisma: PrismaService,
  units: Map<
    string,
    {
      candidateId: string;
      documentUrl: string;
      heading: string;
      unit: string;
      positions: number[];
    }
  >,
  joined: Map<string, number>,
  log: (line: string) => void,
) {
  if (joined.size === 0) return;
  const key = (l: {
    candidateId: string;
    documentUrl: string;
    heading: string;
  }) => `${l.candidateId}\n${l.documentUrl}\n${l.heading}`;
  const wanted = new Map(
    [...units.values()]
      .filter((u) => u.unit !== CHAPTER && u.positions.length > 1)
      .map((u) => [`${key(u)}\n${u.unit}`, u.positions]),
  );
  const labels = await prisma.capLabel.findMany({
    where: {
      unit: { startsWith: 'passage:' },
      status: { not: LabelStatus.rejected },
    },
    select: {
      id: true,
      candidateId: true,
      documentUrl: true,
      heading: true,
      unit: true,
      positions: true,
      decisionMode: true,
      _count: { select: { checks: true } },
    },
  });
  let extended = 0;
  let retired = 0;
  for (const l of labels) {
    const positions = wanted.get(`${key(l)}\n${l.unit}`);
    if (positions && positions.join() !== l.positions.join()) {
      await prisma.capLabel.update({
        where: { id: l.id },
        data: { positions },
      });
      extended++;
      continue;
    }
    const position = Number(l.unit.slice('passage:'.length));
    if (
      joined.has(`${key(l)}\n${position}`) &&
      l._count.checks === 0 &&
      l.decisionMode !== DecisionMode.person
    ) {
      await prisma.capLabel.update({
        where: { id: l.id },
        data: {
          status: LabelStatus.rejected,
          decidedById: TOOL_ACCOUNT_ID,
          decidedAt: new Date(),
          decisionMode: DecisionMode.assistant,
          reason:
            'Suite d’une phrase coupée : rangée avec le passage qui la précède.',
        },
      });
      retired++;
    }
  }
  if (extended + retired > 0)
    log(
      `${extended} rangements étendus à la suite de leur phrase, ${retired} fragments retirés.`,
    );
}

/**
 * Après une relecture, un rangement suit ses passages. Pour chaque
 * rangement d'un document dont la version en vigueur est plus récente que
 * lui : ses passages dans la version précédente (celle qui avait son titre
 * et ses rangs) sont retrouvés par leur texte dans la nouvelle ; s'ils ont
 * changé de titre ou de rang, le rangement est déplacé, ses verdicts avec
 * lui. Un rangement dont le texte n'a pas bougé n'est pas touché ; un
 * rangement dont le texte a disparu sera retiré ensuite.
 */
async function followRereading(
  prisma: PrismaService,
  live: { id: string; url: string; fetchedAt: Date | null; createdAt: Date }[],
  measures: {
    documentId: string;
    article: string;
    quote: string;
    position: number | null;
  }[],
  log: (line: string) => void,
) {
  const liveOf = new Map(live.map((d) => [d.url, d]));
  const labels = (
    await prisma.capLabel.findMany({
      where: {
        documentUrl: { in: [...liveOf.keys()] },
        OR: [
          {
            status: {
              in: [
                LabelStatus.proposed,
                LabelStatus.validated,
                LabelStatus.review,
              ],
            },
          },
          // Un refus en attente de reclassement garde sa carte.
          { checks: { some: {} } },
        ],
      },
      select: {
        id: true,
        candidateId: true,
        documentUrl: true,
        heading: true,
        capCode: true,
        unit: true,
        fromPosition: true,
        positions: true,
        proposedAt: true,
      },
    })
  ).filter((l) => {
    const d = liveOf.get(l.documentUrl)!;
    return l.proposedAt < (d.fetchedAt ?? d.createdAt);
  });
  if (labels.length === 0) return 0;

  const nowOf = new Map<string, ReadPassage[]>();
  for (const m of measures) {
    const list = nowOf.get(m.documentId) ?? [];
    list.push({
      article: m.article,
      position: m.position ?? 0,
      quote: m.quote,
    });
    nowOf.set(m.documentId, list);
  }
  // Les versions précédentes de ces documents, de la plus récente à la plus
  // ancienne, et leurs passages.
  const older = await prisma.politicalDocument.findMany({
    where: {
      url: { in: [...new Set(labels.map((l) => l.documentUrl))] },
      id: { notIn: live.map((d) => d.id) },
    },
    select: { id: true, url: true },
    orderBy: { fetchedAt: 'desc' },
  });
  const oldMeasures = await prisma.measure.findMany({
    where: { documentId: { in: older.map((d) => d.id) } },
    select: { documentId: true, article: true, quote: true, position: true },
  });
  const thenOf = new Map<string, ReadPassage[]>();
  for (const m of oldMeasures) {
    const list = thenOf.get(m.documentId) ?? [];
    list.push({
      article: m.article,
      position: m.position ?? 0,
      quote: m.quote,
    });
    thenOf.set(m.documentId, list);
  }
  const within = (
    l: { heading: string; fromPosition: number | null; positions: number[] },
    list: ReadPassage[],
  ) =>
    list
      .filter((p) => p.article === l.heading && inLabel(l, p.position))
      .map((p) => p.quote);

  let moved = 0;
  for (const l of labels) {
    const now = nowOf.get(liveOf.get(l.documentUrl)!.id) ?? [];
    // La version qui portait ce rangement : la plus récente des anciennes
    // où son titre et ses rangs existent.
    const before = older
      .filter((d) => d.url === l.documentUrl)
      .map((d) => within(l, thenOf.get(d.id) ?? []))
      .find((quotes) => quotes.length > 0);
    if (!before) continue;
    if (sameText(before, within(l, now))) continue;
    const passage = l.unit !== CHAPTER;
    // Un chapitre dont le titre existe toujours, avec des passages à sa
    // place, garde son rangement ; les intertitres apparus dedans sont de
    // nouveaux chapitres, rangés à part.
    if (!passage && within(l, now).length > 0) continue;
    const found = relink(before, now);
    if (!found) continue;
    const main = [...found.passages].sort((a, b) => b.covered - a.covered)[0];
    const data = passage
      ? {
          heading: found.article,
          unit: passageUnit(main.position),
          positions: [main.position],
          fromPosition: main.position,
        }
      : {
          heading: found.article,
          fromPosition:
            l.fromPosition === null ? null : found.passages[0].position,
        };
    if (
      data.heading === l.heading &&
      (passage
        ? l.positions.join() === String(main.position)
        : data.fromPosition === l.fromPosition)
    )
      continue;
    try {
      await prisma.capLabel.update({ where: { id: l.id }, data });
      moved += 1;
    } catch {
      // Le même sujet existe déjà à cet endroit : le rangement sera retiré
      // comme orphelin, celui qui est en place reste.
    }
  }
  if (moved > 0)
    log(`${moved} rangements ont suivi leurs passages sous un nouveau titre.`);
  return moved;
}

/**
 * Retire les rangements dont le chapitre (ou le passage) n'existe plus dans
 * la version en vigueur de leur document. Un document qui n'est plus en
 * vigueur du tout n'est pas touché. La décision est signée du compte de
 * l'outil, jamais de celui d'une personne.
 */
async function retireOrphans(
  prisma: PrismaService,
  live: { id: string; url: string | null }[],
  measures: { documentId: string; article: string; position: number | null }[],
  log: (line: string) => void,
) {
  const docOfUrl = new Map(live.map((d) => [d.url ?? '', d.id]));
  // Les adresses dont tous les documents sont retirés : leurs rangements
  // n'ont plus de texte affiché.
  const liveUrls = new Set(live.map((d) => d.url ?? ''));
  const retiredUrls = new Set(
    (
      await prisma.politicalDocument.findMany({
        where: {
          kind: DocumentKind.programme,
          retiredAt: { not: null },
          url: { notIn: [...liveUrls] },
        },
        select: { url: true },
      })
    ).map((d) => d.url ?? ''),
  );
  const passages = new Set(
    measures.map((m) => `${m.documentId}\n${m.article}\n${m.position ?? 0}`),
  );
  // Le dernier rang de chaque chapitre : un bloc qui commence après n'a plus
  // de texte.
  const lastOf = new Map<string, number>();
  for (const m of measures) {
    const key = `${m.documentId}\n${m.article}`;
    lastOf.set(key, Math.max(lastOf.get(key) ?? 0, m.position ?? 0));
  }
  const labels = await prisma.capLabel.findMany({
    where: {
      status: {
        in: [LabelStatus.proposed, LabelStatus.validated, LabelStatus.review],
      },
    },
    select: {
      id: true,
      documentUrl: true,
      heading: true,
      fromPosition: true,
      positions: true,
    },
  });
  const vanished = (l: {
    documentUrl: string;
    heading: string;
    fromPosition: number | null;
    positions: number[];
  }) => {
    const doc = docOfUrl.get(l.documentUrl);
    if (!doc) return retiredUrls.has(l.documentUrl);
    if (l.positions.length > 0)
      return !l.positions.every((p) =>
        passages.has(`${doc}\n${l.heading}\n${p}`),
      );
    const last = lastOf.get(`${doc}\n${l.heading}`);
    return last === undefined || (l.fromPosition ?? 0) > last;
  };
  const gone = labels.filter(vanished);
  // Un refus qui attendait son reclassement et dont le texte a disparu ne
  // peut plus être reclassé : sa carte est fermée par l'outil, sans quoi
  // elle resterait comptée « à reclasser » sans jamais s'afficher.
  const refused = await prisma.capLabel.findMany({
    where: {
      status: LabelStatus.rejected,
      documentUrl: { in: [...docOfUrl.keys(), ...retiredUrls] },
      checks: { some: {} },
    },
    select: {
      id: true,
      documentUrl: true,
      heading: true,
      fromPosition: true,
      positions: true,
      checks: { orderBy: { checkedAt: 'desc' }, take: 1 },
    },
  });
  const ghosts = refused.filter(
    (l) => l.checks[0]?.verdict === CheckVerdict.refused && vanished(l),
  );
  if (ghosts.length > 0) {
    await prisma.labelCheck.createMany({
      data: ghosts.map((l) => ({
        labelId: l.id,
        verdict: CheckVerdict.vanished,
        checkedById: TOOL_ACCOUNT_ID,
      })),
    });
    log(
      `${ghosts.length} cartes à reclasser fermées : leur texte a disparu à la relecture.`,
    );
  }
  if (gone.length === 0) return 0;
  await prisma.capLabel.updateMany({
    where: { id: { in: gone.map((l) => l.id) } },
    data: {
      status: LabelStatus.rejected,
      decidedById: TOOL_ACCOUNT_ID,
      decidedAt: new Date(),
      decisionMode: DecisionMode.assistant,
      reason: 'Chapitre disparu à la relecture de son document.',
    },
  });
  log(
    `${gone.length} rangements retirés : leur chapitre a disparu à la relecture.`,
  );
  return gone.length;
}
