import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import type { Category } from '../../../domain/category';
import { checkReadingTemplate } from '../../../domain/reading';
import { ComparisonScale } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

export class UpdateIndicatorReadingDto {
  @IsOptional() @IsString() question?: string;
  @IsOptional() @IsString() readingTemplate?: string;
  @IsOptional() @IsString() scaleLow?: string;
  @IsOptional() @IsString() scaleHigh?: string;
  /** Pour une catégorie : son explication en mots simples, par code. */
  @IsOptional() @IsObject() categoryExplanations?: Record<string, string>;
  /** Se compare en France, ou dans sa région seulement. */
  @IsOptional() @IsEnum(ComparisonScale) comparisonScale?: ComparisonScale;
}

/**
 * L'équipe écrit la lecture en mots simples d'un indicateur : sa question, sa
 * phrase de lecture, les deux bouts de son échelle, l'explication de chaque
 * catégorie. La définition, l'unité, le code et les libellés officiels ne
 * changent pas ici.
 */
@Controller('admin/indicators')
@UseGuards(SessionGuard)
@Requires('edit')
export class UpdateIndicatorReadingController {
  constructor(private prisma: PrismaService) {}

  @Patch(':code/reading')
  async update(
    @Param('code') code: string,
    @Body() dto: UpdateIndicatorReadingDto,
  ) {
    const indicator = await this.prisma.indicatorDefinition.findUnique({
      where: { code },
    });
    if (!indicator) throw new NotFoundException('Indicateur inconnu');
    if (dto.readingTemplate) {
      const errors = checkReadingTemplate(dto.readingTemplate);
      if (errors.length > 0) throw new BadRequestException(errors);
    }

    const categories = indicator.categories as Category[] | null;
    if (dto.categoryExplanations && !categories) {
      throw new BadRequestException(
        'Seul un indicateur de catégorie explique ses catégories.',
      );
    }
    const unknown = Object.keys(dto.categoryExplanations ?? {}).filter(
      (c) => !categories?.some((known) => known.code === c),
    );
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Catégories inconnues : ${unknown.join(', ')}.`,
      );
    }

    const text = (value: string | undefined) =>
      value === undefined ? undefined : value.trim() || null;
    return this.prisma.indicatorDefinition.update({
      where: { code },
      data: {
        question: text(dto.question),
        readingTemplate: text(dto.readingTemplate),
        scaleLow: text(dto.scaleLow),
        scaleHigh: text(dto.scaleHigh),
        comparisonScale: dto.comparisonScale,
        ...(dto.categoryExplanations && categories
          ? {
              categories: categories.map((c) => ({
                ...c,
                explanation:
                  dto.categoryExplanations?.[c.code]?.trim() || c.explanation,
              })),
            }
          : {}),
      },
    });
  }
}
