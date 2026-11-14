import {
  BadRequestException,
  ConflictException,
  Controller,
  HttpCode,
  NotFoundException,
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
import {
  ImportState,
  ReviewAction,
  VersionState,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
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
    const version = await this.prisma.datasetVersion.findUnique({
      where: { id },
      include: { importJob: true, _count: { select: { observations: true } } },
    });
    if (!version) throw new NotFoundException('Version inconnue');
    if (version.state !== VersionState.draft) {
      throw new ConflictException('Seul un brouillon se soumet.');
    }
    if (
      version.importJob?.state !== ImportState.validated ||
      version._count.observations === 0
    ) {
      throw new BadRequestException(
        'Contrôlez le fichier sans anomalie bloquante avant de le soumettre.',
      );
    }

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
