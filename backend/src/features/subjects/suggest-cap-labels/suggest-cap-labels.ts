import { createHash } from 'node:crypto';
import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { isVagueHeading } from '../../../domain/cap';
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
    if (isVagueHeading(heading)) continue;
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
  const report = { chapters: chapters.size, proposed: 0, model: '' };
  if (todo.length === 0) return report;

  report.model = classifier.model;
  // Par paquets de dix chapitres, enregistrés au fur et à mesure : une
  // coupure ne fait rien perdre, et une relance reprend où elle s'était
  // arrêtée.
  for (let i = 0; i < todo.length; i += 10) {
    const batch = todo.slice(i, i + 10);
    const choices = await classifier.classify(
      grid,
      batch.map(([id, c]) => ({ id, text: c.text.slice(0, CHAPTER_TEXT) })),
    );
    const byId = new Map(batch);
    for (const choice of choices) {
      const c = byId.get(choice.id);
      if (!c || !choice.code) continue;
      await prisma.capLabel.createMany({
        data: [
          {
            candidateId: c.candidateId,
            documentUrl: c.documentUrl,
            heading: c.heading,
            capCode: choice.code,
            origin: LabelOrigin.model,
            model: classifier.model,
            status: LabelStatus.proposed,
          },
        ],
        skipDuplicates: true,
      });
      report.proposed++;
    }
  }
  return report;
}
