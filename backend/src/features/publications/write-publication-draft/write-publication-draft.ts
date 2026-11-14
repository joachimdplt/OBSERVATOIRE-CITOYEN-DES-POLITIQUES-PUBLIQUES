import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { checkPublicationText } from '../../../domain/publication-content';
import { VersionState } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { loadPublicationVersion } from '../publication-version';

class ChosenIndicatorDto {
  @IsString() code!: string;
  @IsString() justification!: string;
}

class SectionDto {
  @IsString() title!: string;
  @IsString() text!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChosenIndicatorDto)
  indicators!: ChosenIndicatorDto[];
}

export class WritePublicationDraftDto {
  @IsString() title!: string;
  @IsString() summary!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];
}

/**
 * L'équipe écrit un brouillon : le titre, le chapô, et les maillons, chacun
 * avec ses indicateurs et la raison de leur choix. Le brouillon s'enregistre
 * inachevé ; il ne devient public qu'entier (voir la prépublication).
 */
@Controller('admin/publication-versions')
@UseGuards(SessionGuard)
@Requires('edit')
export class WritePublicationDraftController {
  constructor(private prisma: PrismaService) {}

  @Put(':id')
  async write(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WritePublicationDraftDto,
  ) {
    const version = await loadPublicationVersion(this.prisma, id);
    if (version.state !== VersionState.draft)
      throw new ConflictException(
        'Seul un brouillon s’écrit : ouvrez une nouvelle version.',
      );
    const errors = checkPublicationText(dto);
    const codes = [
      ...new Set(dto.sections.flatMap((s) => s.indicators.map((x) => x.code))),
    ];
    const indicators = await this.prisma.indicatorDefinition.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });
    const idOf = new Map(indicators.map((i) => [i.code, i.id]));
    for (const code of codes)
      if (!idOf.has(code))
        errors.push(`L’indicateur « ${code} » n’existe pas.`);
    if (errors.length > 0) throw new BadRequestException(errors);

    await this.prisma.$transaction(async (tx) => {
      const old = await tx.publicationSection.findMany({
        where: { versionId: id },
        select: { id: true },
      });
      await tx.sectionIndicator.deleteMany({
        where: { sectionId: { in: old.map((s) => s.id) } },
      });
      await tx.publicationSection.deleteMany({ where: { versionId: id } });
      await tx.publicationVersion.update({
        where: { id },
        data: { title: dto.title.trim(), summary: dto.summary.trim() },
      });
      for (const [position, section] of dto.sections.entries()) {
        await tx.publicationSection.create({
          data: {
            versionId: id,
            position,
            title: section.title.trim(),
            text: section.text.trim(),
            indicators: {
              create: section.indicators.map((x, i) => ({
                indicatorId: idOf.get(x.code)!,
                position: i,
                justification: x.justification.trim(),
              })),
            },
          },
        });
      }
    });
    return loadPublicationVersion(this.prisma, id);
  }
}
