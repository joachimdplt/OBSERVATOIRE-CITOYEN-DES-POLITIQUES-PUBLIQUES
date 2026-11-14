import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { ProgrammeStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

export class AddCandidateDto {
  @IsString() @IsNotEmpty() slug!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() party!: string;
  @Type(() => Date) @IsDate() declaredAt!: Date;
  @IsUrl({ protocols: ['https'], require_protocol: true })
  declarationSource!: string;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  programmeUrl?: string;
  @IsEnum(ProgrammeStatus) programmeStatus!: ProgrammeStatus;
  @IsOptional() @IsString() programmeNote?: string;
  @Type(() => Date) @IsDate() programmeCheckedAt!: Date;
}

/**
 * L'équipe inscrit un candidat déclaré : son nom, le parti qui le soutient
 * tel qu'il le nomme, la date et la source de sa déclaration, et l'état de
 * son programme à une date de vérification.
 */
@Controller('admin/elections')
@UseGuards(SessionGuard)
@Requires('preprint')
export class AddCandidateController {
  constructor(private prisma: PrismaService) {}

  @Post(':slug/candidates')
  async add(
    @CurrentUser() user: TeamMember,
    @Param('slug') slug: string,
    @Body() dto: AddCandidateDto,
  ) {
    const election = await this.prisma.election.findUnique({ where: { slug } });
    if (!election) throw new NotFoundException('Élection inconnue');
    return this.prisma.candidate.upsert({
      where: { electionId_slug: { electionId: election.id, slug: dto.slug } },
      update: {
        programmeStatus: dto.programmeStatus,
        programmeUrl: dto.programmeUrl ?? null,
        programmeNote: dto.programmeNote?.trim() || null,
        programmeCheckedAt: dto.programmeCheckedAt,
      },
      create: {
        electionId: election.id,
        slug: dto.slug,
        name: dto.name.trim(),
        party: dto.party.trim(),
        declaredAt: dto.declaredAt,
        declarationSource: dto.declarationSource,
        programmeStatus: dto.programmeStatus,
        programmeUrl: dto.programmeUrl ?? null,
        programmeNote: dto.programmeNote?.trim() || null,
        programmeCheckedAt: dto.programmeCheckedAt,
        createdById: user.id,
      },
    });
  }
}
