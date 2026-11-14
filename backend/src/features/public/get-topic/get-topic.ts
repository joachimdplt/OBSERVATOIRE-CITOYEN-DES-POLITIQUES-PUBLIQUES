import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { currentCaptures, surnameOf } from '../../../domain/programme';
import { DocumentKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Un enjeu dans les programmes : pour chaque candidat qui a publié un
 * programme, les passages qui portent un terme de l'enjeu, mot pour mot,
 * avec leur rubrique et leur document. Un candidat sans passage trouvé est
 * nommé aussi : l'absence d'un terme ne dit pas l'absence de position.
 */
@Controller('public/enjeux')
export class GetTopicController {
  constructor(private prisma: PrismaService) {}

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const topic = await this.prisma.topic.findUnique({ where: { slug } });
    if (!topic) throw new NotFoundException('Enjeu inconnu');
    const documents = await this.prisma.politicalDocument.findMany({
      where: { kind: DocumentKind.programme, sourceRef: { not: null } },
      select: {
        id: true,
        sourceRef: true,
        fetchedAt: true,
        createdAt: true,
        candidate: {
          select: {
            slug: true,
            name: true,
            party: true,
            programmeStatus: true,
          },
        },
      },
    });
    const current = currentCaptures(
      documents.map((d) => ({
        id: d.id,
        sourceRef: d.sourceRef!,
        fetchedAt: d.fetchedAt ?? d.createdAt,
      })),
    );
    const matches = await this.prisma.topicMatch.findMany({
      where: {
        topicId: topic.id,
        measure: { documentId: { in: [...current] } },
      },
      select: {
        term: true,
        measure: {
          select: {
            article: true,
            quote: true,
            createdAt: true,
            document: {
              select: {
                title: true,
                url: true,
                fetchedAt: true,
                candidate: { select: { slug: true } },
              },
            },
          },
        },
      },
      orderBy: { measure: { createdAt: 'asc' } },
    });
    const candidates = new Map(
      documents
        .filter((d) => current.has(d.id) && d.candidate)
        .map((d) => [d.candidate!.slug, d.candidate!]),
    );
    const publication = await this.prisma.publication.findUnique({
      where: { slug },
      select: { slug: true },
    });
    return {
      slug: topic.slug,
      name: topic.name,
      pillar: topic.pillar,
      terms: topic.terms,
      publication: publication?.slug ?? null,
      candidates: [...candidates.values()]
        .sort((a, b) =>
          surnameOf(a.name).localeCompare(surnameOf(b.name), 'fr'),
        )
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          party: c.party,
          programmeStatus: c.programmeStatus,
          passages: matches
            .filter((m) => m.measure.document.candidate?.slug === c.slug)
            .map((m) => ({
              heading: m.measure.article,
              quote: m.measure.quote,
              term: m.term,
              document: {
                title: m.measure.document.title,
                url: m.measure.document.url,
                fetchedAt:
                  m.measure.document.fetchedAt?.toISOString().slice(0, 10) ??
                  null,
              },
            })),
        })),
    };
  }
}
