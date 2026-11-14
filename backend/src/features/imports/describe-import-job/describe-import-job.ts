import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsIn,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import {
  checkDescription,
  type ImportDescription,
} from '../../../domain/import-description';
import { ImportState, TerritoryLevel } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { headerOf, loadDraftJob } from '../import-job';

class TerritoryColumnDto {
  @IsString() @IsNotEmpty() column!: string;
  @IsEnum(TerritoryLevel) level!: TerritoryLevel;
  @IsInt() vintage!: number;
}

class PeriodDto {
  @ValidateIf((p: PeriodDto) => p.value === undefined)
  @IsString()
  @IsNotEmpty()
  column?: string;
  @ValidateIf((p: PeriodDto) => p.column === undefined)
  @IsString()
  @IsNotEmpty()
  value?: string;
}

class ValueColumnDto {
  @IsString() @IsNotEmpty() column!: string;
  @IsString() @IsNotEmpty() indicatorCode!: string;
}

export class DescribeImportJobDto {
  @IsInt() @Min(1) headerRow!: number;
  @IsOptional() @IsInt() @Min(2) firstRow?: number;
  @IsOptional() @IsInt() @Min(2) lastRow?: number;
  @ValidateNested()
  @Type(() => TerritoryColumnDto)
  territory!: TerritoryColumnDto;
  @ValidateNested() @Type(() => PeriodDto) period!: PeriodDto;
  @IsIn([',', '.']) decimalSeparator!: ',' | '.';
  @ValidateNested({ each: true })
  @Type(() => ValueColumnDto)
  @ArrayMinSize(1)
  values!: ValueColumnDto[];
}

/**
 * L'équipe décrit les colonnes d'un fichier déposé : la ligne d'en-têtes, la
 * colonne du territoire et son niveau, la période, le séparateur décimal, et
 * l'indicateur que porte chaque colonne de valeurs.
 *
 * Tout ce qui se vérifie sans lire les valeurs l'est ici : les colonnes
 * existent, les indicateurs appartiennent au jeu, le millésime des
 * territoires est chargé. Les valeurs, elles, se contrôlent ensuite.
 */
@Controller('admin/import-jobs')
@UseGuards(SessionGuard)
@Requires('edit')
export class DescribeImportJobController {
  constructor(private prisma: PrismaService) {}

  @Put(':id/description')
  async describe(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DescribeImportJobDto,
  ) {
    const job = await loadDraftJob(this.prisma, id);

    const description: ImportDescription = {
      headerRow: dto.headerRow,
      firstRow: dto.firstRow ?? null,
      lastRow: dto.lastRow ?? null,
      territory: dto.territory,
      period:
        dto.period.column !== undefined
          ? { column: dto.period.column }
          : { value: dto.period.value! },
      decimalSeparator: dto.decimalSeparator,
      values: dto.values,
    };

    const header = await headerOf(this.prisma, id, description.headerRow);
    const errors = checkDescription(description, header);

    const codes = description.values.map((v) => v.indicatorCode);
    const indicators = await this.prisma.indicatorDefinition.findMany({
      where: { code: { in: codes }, datasetId: job.version.datasetId },
      select: { code: true },
    });
    const knownCodes = new Set(indicators.map((i) => i.code));
    for (const code of codes) {
      if (!knownCodes.has(code))
        errors.push(`L'indicateur « ${code} » n'est pas défini pour ce jeu.`);
    }

    const vintage = await this.prisma.territoryVintage.findUnique({
      where: { year: description.territory.vintage },
    });
    if (!vintage) {
      errors.push(
        `Les territoires du COG ${description.territory.vintage} ne sont pas chargés.`,
      );
    }

    if (errors.length > 0) throw new BadRequestException(errors);

    return this.prisma.importJob.update({
      where: { id },
      data: {
        headerRow: description.headerRow,
        description,
        state: ImportState.described,
        validatedAt: null,
      },
    });
  }
}
