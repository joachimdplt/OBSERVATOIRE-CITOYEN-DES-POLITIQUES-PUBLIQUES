import {
  BadRequestException,
  ConflictException,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PUBLIC_STATES } from '../../../domain/publication';
import { checkPublicationContent } from '../../../domain/publication-content';
import { ReviewAction, VersionState } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  contentOf,
  loadPublicationVersion,
  recordPublicationEvent,
  supersedePublicPublication,
} from '../publication-version';

/**
 * L'administration prépublie seule un brouillon entier, comme arXiv publie un
 * article avant sa relecture. Il faut que chaque maillon ait son texte et ses
 * indicateurs justifiés, et que chaque indicateur ait des données vérifiées à
 * montrer : une publication ne renvoie pas à un indicateur vide.
 */
@Controller('admin/publication-versions')
@UseGuards(SessionGuard)
@Requires('preprint')
export class PreprintPublicationController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/preprint')
  @HttpCode(200)
  async preprint(
    @CurrentUser() user: TeamMember,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const version = await loadPublicationVersion(this.prisma, id);
    if (version.state !== VersionState.draft)
      throw new ConflictException('Seul un brouillon se prépublie.');
    const content = contentOf(version);
    const errors = checkPublicationContent(content);
    const codes = [
      ...new Set(
        content.sections.flatMap((s) => s.indicators.map((x) => x.code)),
      ),
    ];
    const withData = await this.prisma.indicatorDefinition.findMany({
      where: {
        code: { in: codes },
        sources: {
          some: {
            retiredAt: null,
            dataset: { versions: { some: { state: { in: PUBLIC_STATES } } } },
          },
        },
      },
      select: { code: true },
    });
    const ready = new Set(withData.map((i) => i.code));
    for (const code of codes)
      if (!ready.has(code))
        errors.push(
          `L’indicateur « ${code} » n’a pas encore de données vérifiées.`,
        );
    if (errors.length > 0) throw new BadRequestException(errors);

    return this.prisma.$transaction(async (tx) => {
      await supersedePublicPublication(tx, version, user.id);
      const now = new Date();
      const preprinted = await tx.publicationVersion.update({
        where: { id, state: VersionState.draft },
        data: {
          state: VersionState.preprint,
          submittedById: user.id,
          submittedAt: now,
          publishedAt: now,
        },
      });
      await recordPublicationEvent(tx, {
        actorId: user.id,
        action: ReviewAction.preprinted,
        versionId: id,
        before: version,
        after: preprinted,
      });
      return preprinted;
    });
  }
}
