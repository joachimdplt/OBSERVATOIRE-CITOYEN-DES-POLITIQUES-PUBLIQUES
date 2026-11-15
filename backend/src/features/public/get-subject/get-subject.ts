import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { currentCaptures } from '../../../domain/programme';
import { DocumentKind, LabelStatus } from '../../../generated/prisma/enums';
import {
  subjectChapters,
  type SubjectChapter,
} from '../../../domain/subject-chapters';
import { PrismaService } from '../../../prisma/prisma.service';

/** Les premiers passages cités sous chaque chapitre. */
const EXCERPT = 2;

/**
 * Un sujet de la grille CAP et, pour chaque candidat, ses chapitres rangés
 * dans ce sujet : leur titre exact, leur document et leurs premiers passages
 * cités mot pour mot. Le rangement est automatique ; un rangement retiré ne
 * s'affiche pas. Aucun compte, aucune part : un candidat sans chapitre rangé
 * ici est nommé à part, sans conclusion sur sa position.
 */
@Controller('public/subjects')
export class GetSubjectController {
  constructor(private prisma: PrismaService) {}

  @Get(':code')
  async get(@Param('code') code: string) {
    const topic = await this.prisma.capTopic.findUnique({ where: { code } });
    if (!topic || topic.level !== 1)
      throw new NotFoundException('Sujet inconnu');

    const labels = await this.prisma.capLabel.findMany({
      where: { capCode: code, status: { not: LabelStatus.rejected } },
      select: {
        candidateId: true,
        documentUrl: true,
        heading: true,
        fromPosition: true,
        model: true,
      },
    });
    const documents = await this.prisma.politicalDocument.findMany({
      where: {
        kind: DocumentKind.programme,
        sourceRef: { not: null },
        retiredAt: null,
        url: { in: [...new Set(labels.map((l) => l.documentUrl))] },
      },
      select: {
        id: true,
        sourceRef: true,
        fetchedAt: true,
        createdAt: true,
        url: true,
        title: true,
      },
    });
    const current = currentCaptures(
      documents.map((d) => ({
        id: d.id,
        sourceRef: d.sourceRef!,
        fetchedAt: d.fetchedAt ?? d.createdAt,
      })),
    );
    const live = new Map(
      documents.filter((d) => current.has(d.id)).map((d) => [d.url, d]),
    );
    const candidates = await this.prisma.candidate.findMany({
      where: { election: { slug: 'presidentielle-2027' } },
      select: {
        id: true,
        slug: true,
        name: true,
        party: true,
        photoUrl: true,
        programmeStatus: true,
        programmeNote: true,
      },
      orderBy: { name: 'asc' },
    });

    const byCandidate = new Map<string, SubjectChapter[]>();
    // Tous les passages des chapitres rangés, en une seule requête.
    const wanted = labels.filter((l) => live.has(l.documentUrl));
    const measures = await this.prisma.measure.findMany({
      where: {
        documentId: {
          in: [...new Set(wanted.map((l) => live.get(l.documentUrl)!.id))],
        },
        article: { in: [...new Set(wanted.map((l) => l.heading))] },
      },
      select: {
        documentId: true,
        article: true,
        quote: true,
        page: true,
        position: true,
      },
      orderBy: { position: 'asc' },
    });
    const passagesOf = new Map<string, typeof measures>();
    for (const m of measures) {
      const key = `${m.documentId}\n${m.article}`;
      const list = passagesOf.get(key) ?? [];
      list.push(m);
      passagesOf.set(key, list);
    }
    for (const l of wanted) {
      const d = live.get(l.documentUrl)!;
      // Les premiers passages du chapitre, ou, pour un long chapitre rangé
      // bloc par bloc, ceux du bloc qui parle de ce sujet.
      const passages = (passagesOf.get(`${d.id}\n${l.heading}`) ?? [])
        .filter(
          (p) => l.fromPosition === null || (p.position ?? 0) >= l.fromPosition,
        )
        .slice(0, EXCERPT);
      if (passages.length === 0) continue;
      const list = byCandidate.get(l.candidateId) ?? [];
      list.push({
        heading: l.heading,
        document: { title: d.title, url: d.url ?? '' },
        excerpt: passages.map((p) => ({ quote: p.quote, page: p.page })),
        position: passages[0].position ?? 0,
      });
      byCandidate.set(l.candidateId, list);
    }

    // Les candidats qui ont au moins un programme collecté et lu.
    const collected = new Set(
      (
        await this.prisma.politicalDocument.findMany({
          where: {
            kind: DocumentKind.programme,
            retiredAt: null,
            measures: { some: {} },
          },
          select: { candidateId: true },
          distinct: ['candidateId'],
        })
      ).map((d) => d.candidateId),
    );

    const model = labels.find((l) => l.model)?.model ?? null;
    return {
      topic: { code: topic.code, label: topic.labelFr, title: topic.title },
      classification: {
        grid: 'Comparative Agendas Project',
        automatic: true,
        model,
      },
      candidates: candidates
        .filter((c) => byCandidate.has(c.id))
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          party: c.party,
          photo: c.photoUrl,
          // Ce que sont ses documents (programme complet, contre-budget…),
          // pour qu'une citation ne passe pas pour plus qu'elle n'est.
          programmeStatus: c.programmeStatus,
          programmeNote: c.programmeNote,
          chapters: subjectChapters(byCandidate.get(c.id)!),
        })),
      // Ceux qui n'ont rien ici : sans aucun programme collecté, ou avec
      // un programme collecté mais aucun chapitre rangé dans ce sujet.
      without: candidates
        .filter((c) => !byCandidate.has(c.id))
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          collected: collected.has(c.id),
        })),
    };
  }
}
