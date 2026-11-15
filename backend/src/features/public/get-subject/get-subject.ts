import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { currentCaptures } from '../../../domain/programme';
import { DocumentKind, LabelStatus } from '../../../generated/prisma/enums';
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
      select: { id: true, slug: true, name: true, party: true, photoUrl: true },
      orderBy: { name: 'asc' },
    });

    const byCandidate = new Map<
      string,
      {
        heading: string;
        document: { title: string; url: string };
        excerpt: { quote: string; page: number | null }[];
      }[]
    >();
    for (const l of labels) {
      const d = live.get(l.documentUrl);
      if (!d) continue;
      const passages = await this.prisma.measure.findMany({
        where: { documentId: d.id, article: l.heading },
        select: { quote: true, page: true },
        orderBy: { position: 'asc' },
        take: EXCERPT,
      });
      if (passages.length === 0) continue;
      const list = byCandidate.get(l.candidateId) ?? [];
      list.push({
        heading: l.heading,
        document: { title: d.title, url: d.url ?? '' },
        excerpt: passages,
      });
      byCandidate.set(l.candidateId, list);
    }

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
          chapters: byCandidate.get(c.id)!,
        })),
      without: candidates
        .filter((c) => !byCandidate.has(c.id))
        .map((c) => ({ slug: c.slug, name: c.name })),
    };
  }
}
