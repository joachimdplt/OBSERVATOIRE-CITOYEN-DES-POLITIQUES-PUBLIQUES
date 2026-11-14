import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { loadPublicIndicator, provenancesOf } from '../public-indicator';

/**
 * Un visiteur ouvre la fiche d'un indicateur : ce qu'il mesure, sur quel
 * champ, dans quelle unité, selon quelle méthode, ce qu'il ne dit pas, les
 * périodes et niveaux géographiques disponibles, et d'où viennent les
 * chiffres.
 */
@Controller('public/indicators')
export class GetIndicatorController {
  constructor(private prisma: PrismaService) {}

  @Get(':code')
  async get(@Param('code') code: string) {
    const loaded = await loadPublicIndicator(this.prisma, code);
    const { indicator, versions } = loaded;

    const where = {
      indicatorId: indicator.id,
      versionId: { in: versions.map((v) => v.id) },
    };
    const [periods, levels] = await Promise.all([
      this.prisma.observation.findMany({
        where,
        distinct: ['period'],
        select: { period: true },
        orderBy: { period: 'asc' },
      }),
      this.prisma.territory.findMany({
        where: { observations: { some: where } },
        distinct: ['level'],
        select: { level: true },
      }),
    ]);

    return {
      code: indicator.code,
      label: indicator.label,
      definition: indicator.definition,
      scope: indicator.scope,
      unit: indicator.unit,
      pillar: indicator.pillar,
      method: indicator.method,
      limits: indicator.limits,
      allowedAggregations: indicator.allowedAggregations,
      // Un nombre, ou une catégorie d'une liste fermée avec ses libellés officiels.
      kind: indicator.kind,
      categories: indicator.categories,
      periods: periods.map((p) => p.period),
      territoryLevels: levels.map((l) => l.level),
      provenance: provenancesOf(loaded),
    };
  }
}
