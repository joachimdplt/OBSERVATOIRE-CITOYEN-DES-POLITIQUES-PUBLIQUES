import { createHash } from 'node:crypto';
import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
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

/** Les sujets proposés pour chaque chapitre. */
const PER_CHAPTER = 3;
/** Le texte d'un chapitre donné au classeur : son titre et son début. */
const CHAPTER_TEXT = 1500;

/**
 * Les propositions de sujets : chaque chapitre des programmes en vigueur
 * (son document et son titre exact) reçoit les trois sous-sujets CAP les
 * plus proches selon le classeur. Elles attendent une personne. Un chapitre
 * déjà étiqueté, quel que soit l'état de ses étiquettes, n'est pas reproposé.
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
) {
  const subtopics = await prisma.capTopic.findMany({
    where: { level: 2 },
    include: { major: true },
  });
  if (subtopics.length === 0)
    throw new Error('La grille CAP n’est pas importée (npm run cap:import).');

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
    select: { documentId: true, article: true, quote: true },
    orderBy: { position: 'asc' },
  });

  // Les chapitres : un document et un titre ; un passage sans titre propre
  // ou une ligne de sommaire ne fait pas un chapitre.
  const docOf = new Map(live.map((d) => [d.id, d]));
  const chapters = new Map<
    string,
    { candidateId: string; documentUrl: string; heading: string; text: string }
  >();
  for (const m of measures) {
    const d = docOf.get(m.documentId)!;
    const heading = m.article.trim();
    if (!heading || heading === d.title) continue;
    if (/^(table des mati[eè]res|sommaire)$/i.test(heading)) continue;
    const id = createHash('sha256')
      .update(`${d.candidateId}\n${d.url}\n${heading}`)
      .digest('hex')
      .slice(0, 24);
    const c = chapters.get(id) ?? {
      candidateId: d.candidateId!,
      documentUrl: d.url ?? '',
      heading,
      text: heading,
    };
    if (c.text.length < CHAPTER_TEXT) c.text = `${c.text}\n${m.quote}`;
    chapters.set(id, c);
  }

  // Un chapitre déjà étiqueté n'est pas reproposé.
  const labelled = new Set(
    (
      await prisma.capLabel.findMany({
        select: { candidateId: true, documentUrl: true, heading: true },
      })
    ).map((l) => `${l.candidateId}\n${l.documentUrl}\n${l.heading}`),
  );
  const todo = [...chapters.entries()].filter(
    ([, c]) =>
      !labelled.has(`${c.candidateId}\n${c.documentUrl}\n${c.heading}`),
  );
  const report = { chapters: chapters.size, proposed: 0, labels: 0, model: '' };
  if (todo.length === 0) return report;

  const { model, results } = await classifier.suggest(
    subtopics.map((t) => ({
      code: t.code,
      text: `${t.major?.title ?? ''}: ${t.title}. ${t.description ?? ''}`,
    })),
    todo.map(([id, c]) => ({ id, text: c.text.slice(0, CHAPTER_TEXT) })),
    PER_CHAPTER,
  );
  report.model = model;
  const byId = new Map(todo);
  for (const r of results) {
    const c = byId.get(r.id);
    if (!c) continue;
    await prisma.capLabel.createMany({
      data: r.suggestions.map((s) => ({
        candidateId: c.candidateId,
        documentUrl: c.documentUrl,
        heading: c.heading,
        capCode: s.code,
        origin: LabelOrigin.model,
        score: s.score,
        model,
        status: LabelStatus.proposed,
      })),
      skipDuplicates: true,
    });
    report.proposed++;
    report.labels += r.suggestions.length;
  }
  return report;
}
