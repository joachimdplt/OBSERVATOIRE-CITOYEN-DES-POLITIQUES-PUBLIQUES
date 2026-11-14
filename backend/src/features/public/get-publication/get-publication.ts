import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  PUBLIC_STATES,
  PUBLICATION_LABELS,
  type PublicState,
} from '../../../domain/publication';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Un visiteur lit une publication : son titre, son chapô, ses maillons et,
 * pour chacun, les indicateurs choisis avec la raison de leur choix. Elle est
 * signée de son auteur et, une fois relue, de sa relectrice ou de son
 * relecteur ; les versions précédentes restent listées.
 */
@Controller('public/publications')
export class GetPublicationController {
  constructor(private prisma: PrismaService) {}

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { slug },
      include: {
        versions: {
          where: { state: { in: [...PUBLIC_STATES, 'superseded'] } },
          orderBy: { number: 'desc' },
          include: {
            submittedBy: { select: { name: true } },
            reviewedBy: { select: { name: true } },
            sections: {
              orderBy: { position: 'asc' },
              include: {
                measures: {
                  orderBy: { position: 'asc' },
                  include: { measure: { include: { document: true } } },
                },
                indicators: {
                  orderBy: { position: 'asc' },
                  include: {
                    indicator: {
                      select: {
                        code: true,
                        label: true,
                        unit: true,
                        kind: true,
                        mapLayer: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const current = publication?.versions.find((v) =>
      (PUBLIC_STATES as string[]).includes(v.state),
    );
    if (!publication || !current)
      throw new NotFoundException('Publication inconnue');
    return {
      slug: publication.slug,
      pillar: publication.pillar,
      title: current.title,
      summary: current.summary,
      number: current.number,
      status: current.state,
      statusLabel: PUBLICATION_LABELS[current.state as PublicState],
      publishedAt: current.publishedAt,
      authoredBy: current.submittedBy?.name ?? null,
      reviewedBy: current.reviewedBy?.name ?? null,
      sections: current.sections.map((s) => ({
        title: s.title,
        text: s.text,
        indicators: s.indicators.map((x) => ({
          ...x.indicator,
          justification: x.justification,
        })),
        // La citation d'abord, puis le libellé, puis le document.
        measures: s.measures.map(({ measure: m, justification }) => ({
          article: m.article,
          quote: m.quote,
          label: m.label,
          justification,
          document: {
            kind: m.document.kind,
            title: m.document.title,
            number: m.document.number,
            chamber: m.document.chamber,
            filedAt: m.document.filedAt.toISOString().slice(0, 10),
            url: m.document.url,
            firstAuthor: m.document.firstAuthor,
            authorGroup: m.document.authorGroup,
            authorGroupSource: m.document.authorGroupSource,
            progress: m.document.progress,
          },
        })),
      })),
      // Les versions remplacées restent citables : leur numéro et leur date.
      history: publication.versions
        .filter((v) => v.id !== current.id)
        .map((v) => ({
          number: v.number,
          status: v.state,
          publishedAt: v.publishedAt,
        })),
    };
  }
}
