import {
  BadRequestException,
  Body,
  Controller,
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
import { Chamber, DocumentKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

export class CreatePoliticalDocumentDto {
  @IsEnum(DocumentKind) kind!: DocumentKind;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsEnum(Chamber) chamber?: Chamber;
  @Type(() => Date) @IsDate() filedAt!: Date;
  @IsUrl({ protocols: ['https'], require_protocol: true }) url!: string;
  @IsString() @IsNotEmpty() firstAuthor!: string;
  @IsOptional() @IsString() authorGroup?: string;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  authorGroupSource?: string;
  @IsOptional() @IsString() progress?: string;
}

/**
 * L'équipe enregistre un texte politique : un texte déposé au Parlement, une
 * loi, un programme. Le groupe de l'auteur ne s'inscrit qu'avec la source
 * officielle qui le donne.
 */
@Controller('admin/political-documents')
@UseGuards(SessionGuard)
@Requires('edit')
export class CreatePoliticalDocumentController {
  constructor(private prisma: PrismaService) {}

  @Post()
  create(
    @CurrentUser() user: TeamMember,
    @Body() dto: CreatePoliticalDocumentDto,
  ) {
    if (dto.authorGroup && !dto.authorGroupSource)
      throw new BadRequestException(
        'Le groupe d’un auteur s’inscrit avec la source officielle qui le donne.',
      );
    return this.prisma.politicalDocument.create({
      data: {
        kind: dto.kind,
        title: dto.title.trim(),
        number: dto.number?.trim() || null,
        chamber: dto.chamber ?? null,
        filedAt: dto.filedAt,
        url: dto.url,
        firstAuthor: dto.firstAuthor.trim(),
        authorGroup: dto.authorGroup?.trim() || null,
        authorGroupSource: dto.authorGroupSource ?? null,
        progress: dto.progress?.trim() || null,
        createdById: user.id,
      },
    });
  }
}
