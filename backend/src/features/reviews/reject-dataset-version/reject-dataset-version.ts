import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { canDecide } from '../../../domain/review';
import { ReviewAction, VersionState } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { recordVersionEvent } from '../review-event';

export class RejectDatasetVersionDto {
  /** Ce qui est à reprendre : la trace le garde, et l'équipe le lit. */
  @IsString() @MinLength(10) justification!: string;
}

/**
 * Une personne qui relit rejette une version soumise par quelqu'un d'autre,
 * en disant pourquoi. La version redevient un brouillon : on corrige la
 * description, on contrôle à nouveau, on soumet. Le rejet reste dans
 * l'historique.
 */
@Controller('admin/versions')
@UseGuards(SessionGuard)
@Requires('review')
export class RejectDatasetVersionController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/reject')
  @HttpCode(200)
  async reject(
    @CurrentUser() user: TeamMember,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDatasetVersionDto,
  ) {
    const version = await this.prisma.datasetVersion.findUnique({
      where: { id },
    });
    if (!version) throw new NotFoundException('Version inconnue');
    const decision = canDecide(
      'reject',
      version.state,
      version.submittedById,
      user.id,
    );
    if (!decision.allowed) throw new ForbiddenException(decision.reason);

    return this.prisma.$transaction(async (tx) => {
      const draft = await tx.datasetVersion.update({
        where: { id, state: VersionState.in_review },
        data: {
          state: VersionState.draft,
          submittedById: null,
          submittedAt: null,
        },
      });
      await recordVersionEvent(tx, {
        actorId: user.id,
        action: ReviewAction.rejected,
        versionId: id,
        before: version,
        after: draft,
        justification: dto.justification.trim(),
      });
      return draft;
    });
  }
}
