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
import { supersedePublicVersion } from '../public-version';
import { recordVersionEvent } from '../review-event';

export class ApproveDatasetVersionDto {
  @IsOptional() @IsString() justification?: string;
}

/**
 * Une personne qui relit approuve une version soumise, ou une prépublication,
 * par quelqu'un d'autre : elle est publiée. La version publiée jusque-là pour ce jeu passe à
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
    const decision = canDecide(
      'approve',
      version.state,
      version.submittedById,
      user.id,
    );
    if (!decision.allowed) throw new ForbiddenException(decision.reason);

    return this.prisma.$transaction(async (tx) => {
      await supersedePublicVersion(tx, version, user.id);

      const now = new Date();
      const published = await tx.datasetVersion.update({
        where: {
          id,
          state: { in: [VersionState.in_review, VersionState.preprint] },
        },
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
