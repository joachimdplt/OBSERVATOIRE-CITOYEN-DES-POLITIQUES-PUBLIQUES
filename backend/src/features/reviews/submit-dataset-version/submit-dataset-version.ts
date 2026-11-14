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
import { recordVersionEvent } from '../review-event';

/**
 * L'équipe soumet une version contrôlée à relecture. Elle est alors figée :
 * plus de description, plus de contrôle, jusqu'à la décision.
 */
@Controller('admin/versions')
@UseGuards(SessionGuard)
@Requires('edit')
export class SubmitDatasetVersionController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/submit')
  @HttpCode(200)
  async submit(
    @CurrentUser() user: TeamMember,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const version = await loadReadyDraft(this.prisma, id);

    return this.prisma.$transaction(async (tx) => {
      const after = await tx.datasetVersion.update({
        where: { id, state: VersionState.draft },
        data: {
          state: VersionState.in_review,
          submittedById: user.id,
          submittedAt: new Date(),
        },
      });
      await recordVersionEvent(tx, {
        actorId: user.id,
        action: ReviewAction.submitted,
        versionId: id,
        before: version,
        after,
      });
      return after;
    });
  }
}
