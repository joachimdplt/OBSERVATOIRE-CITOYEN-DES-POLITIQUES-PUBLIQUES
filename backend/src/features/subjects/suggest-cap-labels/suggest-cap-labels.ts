import { createHash } from 'node:crypto';
import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { isVagueHeading } from '../../../domain/cap';
import type { Correction } from '../../../domain/corrections';
import { documentName } from '../../../domain/programme-reading';
import {
  cosine,
  nearestTopic,
  neighboursTopic,
  vote,
  type Proposal,
} from '../../../domain/vote';
import {
  embedMissingPassages,
  embedTexts,
  loadVoteContext,
} from '../vote-cap-labels/vote-cap-labels';
import { currentCaptures } from '../../../domain/programme';
import {
  DocumentKind,
  LabelOrigin,
  LabelStatus,
} from '../../../generated/prisma/enums';
import {
  TOPIC_CLASSIFIER,
  type TopicClassifier,
} from '../../../ports/topic-classifier';
import { PrismaService } from '../../../prisma/prisma.service';

/** Le texte d'un chapitre donné au classeur : son titre et son début. */
const CHAPTER_TEXT = 1500;
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
    if (isVagueHeading(heading)) continue;
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

  // Les corrections de l'équipe : chaque chapitre ou bloc rangé à la main,
  // avec son texte et sa raison. Le modèle voit les plus proches de chaque
  // extrait avant de le ranger, et ne refait pas une erreur déjà corrigée.
  const corrections: Correction[] = (
    await prisma.capLabel.findMany({
      where: { origin: LabelOrigin.person, status: LabelStatus.validated },
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
  const todo = [...chapters.entries()].filter(
    ([, c]) =>
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
    where: { origin: LabelOrigin.person, status: LabelStatus.validated },
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

  for (let i = 0; i < todo.length; i += 1) {
    const batch = todo.slice(i, i + 1);
    const unit = batch[0][1];
    const v = ctx.vectorOf(ctx.blockOf(unit));
    const pick = v
      ? () =>
          correctionVectors
            .map((x) => ({ c: x.c, s: cosine(v, x.v) }))
            .sort((a, b) => b.s - a.s)
            .slice(0, 6)
            .map((x) => x.c)
      : undefined;
    const choices = await classifier.classify(
      grid,
      batch.map(([id, c]) => ({ id, text: c.text.slice(0, CHAPTER_TEXT) })),
      corrections,
      pick,
    );
    const byId = new Map(batch);
    for (const choice of choices) {
      const c = byId.get(choice.id);
      if (!c) continue;
      const done = i + batch.findIndex(([id]) => id === choice.id) + 1;
      const left = Math.round(
        (((Date.now() - started) / done) * (todo.length - done)) / 60000,
      );
      log(
        `[${done}/${todo.length}, encore ~${left} min] ${names.get(c.candidateId) ?? '?'} · ${c.heading.slice(0, 60)}${c.fromPosition !== null ? ` (bloc ${c.fromPosition})` : ''} → ${choice.code ? labelOf.get(choice.code) : 'aucun'}`,
      );
      if (!choice.code) continue;
      const title = titles.get(c.documentUrl) ?? '';
      const proposals: Proposal[] = [
        {
          method: 'grille',
          code: v ? nearestTopic(v, ctx.topicVectors) : null,
        },
        {
          method: 'voisins',
          code: v
            ? neighboursTopic(v, ctx.known, `${c.candidateId}\n${c.heading}`)
            : null,
        },
        { method: 'modele', code: choice.code },
        { method: 'titre', code: await topicOfTitle(title) },
        {
          method: 'rubrique',
          code: await topicOfTitle(`${title} — ${c.heading}`),
        },
      ];
      const agreed = vote(proposals).agreed;
      if (!agreed) report.review++;
      await prisma.capLabel.createMany({
        data: [
          {
            candidateId: c.candidateId,
            documentUrl: c.documentUrl,
            heading: c.heading,
            fromPosition: c.fromPosition,
            capCode: choice.code,
            origin: LabelOrigin.model,
            model: classifier.model,
            proposals,
            status: agreed ? LabelStatus.proposed : LabelStatus.review,
          },
        ],
        skipDuplicates: true,
      });
      report.proposed++;
    }
  }
  return report;
}
