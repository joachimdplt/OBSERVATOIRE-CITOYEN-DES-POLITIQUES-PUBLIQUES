import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsUrl } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { CampaignSourceKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

export class AddCampaignSourceDto {
  @IsEnum(CampaignSourceKind) kind!: CampaignSourceKind;
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }) url!: string;
}

/**
 * L'équipe indique un site à lire pour un candidat : son site de campagne,
 * le site de son parti. Le reste se fait seul, peu à peu.
 */
@Controller('admin/elections')
@UseGuards(SessionGuard)
@Requires('preprint')
export class AddCampaignSourceController {
  constructor(private prisma: PrismaService) {}

  @Post(':slug/candidates/:candidate/campaign-sources')
  async add(
    @CurrentUser() user: TeamMember,
    @Param('slug') slug: string,
    @Param('candidate') candidateSlug: string,
    @Body() dto: AddCampaignSourceDto,
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { slug: candidateSlug, election: { slug } },
    });
    if (!candidate) throw new NotFoundException('Candidat inconnu');
    return this.prisma.campaignSource.upsert({
      where: { candidateId_url: { candidateId: candidate.id, url: dto.url } },
      update: { kind: dto.kind },
      create: {
        candidateId: candidate.id,
        kind: dto.kind,
        url: dto.url,
        createdById: user.id,
      },
    });
  }
}
