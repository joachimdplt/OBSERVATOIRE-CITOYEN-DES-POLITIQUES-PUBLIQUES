import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import {
  type Category,
  checkCategoryAmendment,
} from '../../../domain/category';
import { IndicatorKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CategoryDto, cleanCategory } from '../category.dto';

export class AmendIndicatorCategoriesDto {
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories!: CategoryDto[];
}

/**
 * L'équipe complète la liste fermée d'un indicateur de catégorie : une
 * catégorie de plus (la ZAR, que seules deux régions emploient), les codes
 * d'un autre fichier (« 1_ZIP » pour « ZIP »), le sens propre à une région.
 * Une catégorie déjà déclarée ne se retire, ne se recode ni ne se renomme :
 * des valeurs publiées portent son code et son libellé officiel.
 */
@Controller('admin/indicators')
@UseGuards(SessionGuard)
@Requires('edit')
export class AmendIndicatorCategoriesController {
  constructor(private prisma: PrismaService) {}

  @Put(':code/categories')
  async amend(
    @Param('code') code: string,
    @Body() dto: AmendIndicatorCategoriesDto,
  ) {
    const indicator = await this.prisma.indicatorDefinition.findUnique({
      where: { code },
    });
    if (!indicator) throw new NotFoundException('Indicateur inconnu');
    if (indicator.kind !== IndicatorKind.category)
      throw new BadRequestException(
        'Seul un indicateur de catégorie a une liste de catégories.',
      );
    const categories = dto.categories.map(cleanCategory);
    const errors = checkCategoryAmendment(
      (indicator.categories as Category[] | null) ?? [],
      categories,
    );
    if (errors.length > 0) throw new BadRequestException(errors);
    return this.prisma.indicatorDefinition.update({
      where: { code },
      data: { categories },
    });
  }
}
