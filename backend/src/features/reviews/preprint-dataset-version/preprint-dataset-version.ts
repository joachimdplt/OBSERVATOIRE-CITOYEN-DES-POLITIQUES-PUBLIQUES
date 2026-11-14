import {
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
import { ReviewAction, VersionState } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { loadReadyDraft } from '../ready-draft';
import { supersedePublicVersion } from '../public-version';
import { recordVersionEvent } from '../review-event';

/**
 * L'administration publie seule une version contrôlée, en prépublication,
 * comme arXiv publie un article avant sa relecture.
 *
 * Le public la voit, étiquetée « vérifiée par son seul auteur, en attente de
 * relecture ». Elle remplace la version que le public voyait jusque-là, sans
 * l'effacer. Un relecteur, plus tard, la fera passer à « publiée ».
 */
@Controller('admin/versions')
@UseGuards(SessionGuard)
@Requires('preprint')
export class PreprintDatasetVersionController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/preprint')
  @HttpCode(200)
  async preprint(
    @CurrentUser() user: TeamMember,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const version = await loadReadyDraft(this.prisma, id);

    return this.prisma.$transaction(async (tx) => {
      await supersedePublicVersion(tx, version, user.id);
      const now = new Date();
      const preprinted = await tx.datasetVersion.update({
        where: { id, state: VersionState.draft },
        data: {
          state: VersionState.preprint,
          submittedById: user.id,
          submittedAt: now,
          publishedAt: now,
        },
      });
      await recordVersionEvent(tx, {
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
