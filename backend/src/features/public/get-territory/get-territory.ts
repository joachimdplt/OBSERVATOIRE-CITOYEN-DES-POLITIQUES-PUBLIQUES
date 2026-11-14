import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TerritoryLevel } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Un visiteur ouvre un territoire par son niveau et son code INSEE : son nom,
 * ceux de sa commune, de son département et de sa région, et le millésime du
 * COG d'où il vient.
 *
 * Sans millésime demandé, le plus récent qui connaît ce code.
 */
@Controller('public/territories')
export class GetTerritoryController {
  constructor(private prisma: PrismaService) {}

  @Get(':level/:code')
  async get(
    @Param('level', new ParseEnumPipe(TerritoryLevel)) level: TerritoryLevel,
    @Param('code') code: string,
    @Query('vintage', new ParseIntPipe({ optional: true })) vintage?: number,
  ) {
    const territory = await this.prisma.territory.findFirst({
      where: {
        level,
        code: code.toUpperCase(),
        ...(vintage ? { vintage } : {}),
      },
      orderBy: { vintage: 'desc' },
      include: { territoryVintage: true },
    });
    if (!territory) throw new NotFoundException('Territoire inconnu');

    const parent = (parentLevel: TerritoryLevel, parentCode: string | null) =>
      parentCode
        ? this.prisma.territory.findUnique({
            where: {
              level_code_vintage: {
                level: parentLevel,
                code: parentCode,
                vintage: territory.vintage,
              },
            },
            select: { level: true, code: true, name: true },
          })
        : null;

    const parents = await Promise.all([
      parent(TerritoryLevel.commune, territory.communeCode),
      parent(TerritoryLevel.department, territory.departmentCode),
      parent(TerritoryLevel.region, territory.regionCode),
    ]);

    return {
      level: territory.level,
      code: territory.code,
      name: territory.name,
      vintage: territory.vintage,
      parents: parents.filter((p) => p !== null),
      source: {
        producer: 'INSEE',
        title: `Code officiel géographique ${territory.vintage}`,
        license: 'Licence Ouverte 2.0',
        files: territory.territoryVintage.sources,
      },
    };
  }
}
