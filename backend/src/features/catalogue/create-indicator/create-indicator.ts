import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { readIndicatorCode } from '../../../domain/indicator-code';
import { Aggregation, Pillar } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { isUniqueViolation } from '../../../prisma/unique-violation';

export class CreateIndicatorDto {
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
          datasetId: dataset.id,
          label: dto.label.trim(),
          definition: dto.definition.trim(),
          scope: dto.scope.trim(),
          unit: dto.unit.trim(),
          pillar: dto.pillar,
          allowedAggregations: dto.allowedAggregations,
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
