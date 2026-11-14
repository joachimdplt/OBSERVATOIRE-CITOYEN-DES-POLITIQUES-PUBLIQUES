import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { checkCategories } from '../../../domain/category';
import { readIndicatorCode } from '../../../domain/indicator-code';
import {
  Aggregation,
  IndicatorKind,
  Pillar,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { isUniqueViolation } from '../../../prisma/unique-violation';

class CategoryDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() label!: string;
}

export class CreateIndicatorDto {
  /** Un nombre, par défaut, ou une catégorie d'une liste fermée. */
  @IsOptional() @IsEnum(IndicatorKind) kind?: IndicatorKind;
  /** Pour une catégorie : la liste fermée, avec les libellés du texte officiel. */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories?: CategoryDto[];
  @IsUUID() datasetId!: string;
  @IsString() code!: string;
  @IsString() @IsNotEmpty() label!: string;
  @IsString() @IsNotEmpty() definition!: string;
  @IsString() @IsNotEmpty() scope!: string;
  @IsString() @IsNotEmpty() unit!: string;
  @IsEnum(Pillar) pillar!: Pillar;
  @IsArray()
  @ArrayUnique()
  @IsEnum(Aggregation, { each: true })
  allowedAggregations!: Aggregation[];
  @IsString() @IsNotEmpty() method!: string;
  @IsString() @IsNotEmpty() limits!: string;
}

/**
 * L'équipe définit un indicateur d'un jeu : ce qu'il mesure, sur quel champ,
 * dans quelle unité, et ce qu'il ne dit pas.
 *
 * Les limites sont obligatoires. L'APL n'est pas un nombre de médecins
 * manquants ; 21,1 élèves par classe est une moyenne nationale qui ne dit
 * rien de l'éducation prioritaire. Un indicateur sans ses limites invite à lui
 * faire dire ce qu'il ne dit pas.
 *
 * Les agrégations permises sont déclarées ici, et nulle part ailleurs : un
 * taux ne s'additionne pas, une moyenne de moyennes ment.
 */
@Controller('admin/indicators')
@UseGuards(SessionGuard)
@Requires('edit')
export class CreateIndicatorController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(
    @CurrentUser() user: TeamMember,
    @Body() dto: CreateIndicatorDto,
  ) {
    const kind = dto.kind ?? IndicatorKind.number;
    if (kind === IndicatorKind.category) {
      const errors = checkCategories(dto.categories ?? []);
      if (dto.allowedAggregations.length > 0) {
        errors.push('Une catégorie ne s’additionne ni ne se moyenne.');
      }
      if (errors.length > 0) throw new BadRequestException(errors);
    } else if (dto.categories) {
      throw new BadRequestException(
        'Seul un indicateur de catégorie a une liste de catégories.',
      );
    }

    const code = readIndicatorCode(dto.code);
    if (!code.valid) throw new BadRequestException(code.reason);

    const dataset = await this.prisma.sourceDataset.findUnique({
      where: { id: dto.datasetId },
    });
    if (!dataset) throw new NotFoundException('Jeu de données inconnu');

    try {
      return await this.prisma.indicatorDefinition.create({
        data: {
          code: code.code,
          // Le premier jeu qui alimente l'indicateur ; d'autres peuvent s'y relier.
          sources: { create: { datasetId: dataset.id, createdById: user.id } },
          label: dto.label.trim(),
          definition: dto.definition.trim(),
          scope: dto.scope.trim(),
          unit: dto.unit.trim(),
          pillar: dto.pillar,
          allowedAggregations: dto.allowedAggregations,
          kind,
          categories:
            kind === IndicatorKind.category
              ? (dto.categories ?? []).map((c) => ({
                  code: c.code.trim(),
                  label: c.label.trim(),
                }))
              : undefined,
          method: dto.method.trim(),
          limits: dto.limits.trim(),
          createdById: user.id,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(`Le code ${code.code} est déjà pris.`);
      }
      throw err;
    }
  }
}
