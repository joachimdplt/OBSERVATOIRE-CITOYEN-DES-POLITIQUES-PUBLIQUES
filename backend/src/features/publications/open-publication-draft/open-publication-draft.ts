import {
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { VersionState } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { loadPublicationVersion } from '../publication-version';

/**
 * L'équipe ouvre une nouvelle version d'une publication pour la corriger ou
 * la compléter : un brouillon qui reprend la dernière version, maillons et
 * justifications compris. La version publique reste lisible jusqu'à ce que
 * la nouvelle la remplace.
 */
@Controller('admin/publications')
@UseGuards(SessionGuard)
@Requires('edit')
export class OpenPublicationDraftController {
  constructor(private prisma: PrismaService) {}

  @Post(':slug/drafts')
  async open(@CurrentUser() user: TeamMember, @Param('slug') slug: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { slug },
      include: { versions: { orderBy: { number: 'desc' } } },
    });
    if (!publication) throw new NotFoundException('Publication inconnue');
    if (publication.versions.some((v) => v.state === VersionState.draft))
      throw new ConflictException('Un brouillon est déjà ouvert.');
    const last = await loadPublicationVersion(
      this.prisma,
      publication.versions[0].id,
    );
    return this.prisma.publicationVersion.create({
      data: {
        publicationId: publication.id,
        number: last.number + 1,
        title: last.title,
        summary: last.summary,
        createdById: user.id,
        sections: {
          create: last.sections.map((s) => ({
            position: s.position,
            title: s.title,
            text: s.text,
            indicators: {
              create: s.indicators.map((x) => ({
                indicatorId: x.indicatorId,
                position: x.position,
                justification: x.justification,
              })),
            },
          })),
        },
      },
    });
  }
}
