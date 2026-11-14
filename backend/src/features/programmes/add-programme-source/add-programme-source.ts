import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

export class AddProgrammeSourceDto {
  @IsUrl({ protocols: ['https'], require_protocol: true }) url!: string;
  /** Pour une table des matières : le motif des liens à suivre. */
  @IsOptional() @IsString() follow?: string;
}

/**
 * L'équipe indique où se lit le programme d'un candidat : un fichier, une
 * page, ou une table des matières et le motif des pages à suivre. Le
 * collecteur fait le reste.
 */
@Controller('admin/elections')
@UseGuards(SessionGuard)
@Requires('preprint')
export class AddProgrammeSourceController {
  constructor(private prisma: PrismaService) {}

  @Post(':slug/candidates/:candidate/programme-sources')
  async add(
    @CurrentUser() user: TeamMember,
    @Param('slug') slug: string,
    @Param('candidate') candidateSlug: string,
    @Body() dto: AddProgrammeSourceDto,
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { slug: candidateSlug, election: { slug } },
    });
    if (!candidate) throw new NotFoundException('Candidat inconnu');
    if (dto.follow) {
      try {
        new RegExp(dto.follow);
      } catch {
        throw new BadRequestException('Motif de liens illisible');
      }
    }
    return this.prisma.programmeSource.upsert({
      where: { candidateId_url: { candidateId: candidate.id, url: dto.url } },
      update: { follow: dto.follow ?? null },
      create: {
        candidateId: candidate.id,
        url: dto.url,
        follow: dto.follow ?? null,
        createdById: user.id,
      },
    });
  }
}
