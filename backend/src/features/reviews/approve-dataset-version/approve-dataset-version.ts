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
import { IsOptional, IsString } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { canDecide } from '../../../domain/review';
import { ReviewAction, VersionState } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { recordVersionEvent } from '../review-event';

export class ApproveDatasetVersionDto {
  @IsOptional() @IsString() justification?: string;
}

/**
 * Une personne qui relit approuve une version soumise par quelqu'un d'autre :
 * elle est publiée. La version publiée jusque-là pour ce jeu passe à
 * « remplacée », sans être effacée. Les deux gestes et leurs deux traces
 * tiennent dans une seule transaction.
 */
@Controller('admin/versions')
@UseGuards(SessionGuard)
@Requires('review')
export class ApproveDatasetVersionController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @CurrentUser() user: TeamMember,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDatasetVersionDto,
  ) {
    const version = await this.prisma.datasetVersion.findUnique({
      where: { id },
    });
    if (!version) throw new NotFoundException('Version inconnue');
    const decision = canDecide(version.state, version.submittedById, user.id);
    if (!decision.allowed) throw new ForbiddenException(decision.reason);

    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.datasetVersion.findFirst({
        where: { datasetId: version.datasetId, state: VersionState.published },
      });
      if (previous) {
        const replaced = await tx.datasetVersion.update({
          where: { id: previous.id },
          data: { state: VersionState.superseded },
        });
        await recordVersionEvent(tx, {
          actorId: user.id,
          action: ReviewAction.superseded,
          versionId: previous.id,
          before: previous,
          after: replaced,
          justification: `Remplacée par la version « ${version.vintage} ».`,
        });
      }

      const now = new Date();
      const published = await tx.datasetVersion.update({
        where: { id, state: VersionState.in_review },
        data: {
          state: VersionState.published,
          reviewedById: user.id,
          reviewedAt: now,
          publishedAt: now,
        },
      });
      await recordVersionEvent(tx, {
        actorId: user.id,
        action: ReviewAction.approved,
        versionId: id,
        before: version,
        after: published,
        justification: dto.justification?.trim() || null,
      });
      return published;
    });
  }
}
