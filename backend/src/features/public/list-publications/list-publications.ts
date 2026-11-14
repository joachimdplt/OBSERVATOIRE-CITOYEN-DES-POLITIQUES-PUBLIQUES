import { Controller, Get } from '@nestjs/common';
import {
  PUBLIC_STATES,
  PUBLICATION_LABELS,
  type PublicState,
} from '../../../domain/publication';
import { PrismaService } from '../../../prisma/prisma.service';

/** Un visiteur voit les publications lisibles : celles qui ont une version publiée ou prépubliée. */
@Controller('public/publications')
export class ListPublicationsPublicController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const versions = await this.prisma.publicationVersion.findMany({
      where: { state: { in: PUBLIC_STATES } },
      orderBy: { title: 'asc' },
      include: { publication: { select: { slug: true, pillar: true } } },
    });
    return versions.map((v) => ({
      slug: v.publication.slug,
      pillar: v.publication.pillar,
      title: v.title,
      summary: v.summary,
      number: v.number,
      status: v.state,
      statusLabel: PUBLICATION_LABELS[v.state as PublicState],
      publishedAt: v.publishedAt,
    }));
  }
}
