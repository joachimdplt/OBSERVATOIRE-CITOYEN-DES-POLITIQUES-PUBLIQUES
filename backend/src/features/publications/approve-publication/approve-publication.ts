import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
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
import {
  loadPublicationVersion,
  recordPublicationEvent,
  supersedePublicPublication,
} from '../publication-version';

export class ApprovePublicationDto {
  @IsOptional() @IsString() justification?: string;
}

/**
 * Une personne qui relit approuve une publication prépubliée par quelqu'un
 * d'autre : elle devient « publiée », signée de son auteur et de sa
 * relectrice ou de son relecteur.
 */
@Controller('admin/publication-versions')
@UseGuards(SessionGuard)
@Requires('review')
export class ApprovePublicationController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @CurrentUser() user: TeamMember,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovePublicationDto,
  ) {
    const version = await loadPublicationVersion(this.prisma, id);
    const decision = canDecide(
      'approve',
      version.state,
      version.submittedById,
      user.id,
    );
    if (!decision.allowed) throw new ForbiddenException(decision.reason);

    return this.prisma.$transaction(async (tx) => {
      await supersedePublicPublication(tx, version, user.id);
      const now = new Date();
      const published = await tx.publicationVersion.update({
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
      await recordPublicationEvent(tx, {
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
