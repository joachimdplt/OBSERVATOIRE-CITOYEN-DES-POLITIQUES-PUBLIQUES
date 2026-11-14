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
    const [periods, levels, retired] = await Promise.all([
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
      this.prisma.indicatorSource.findMany({
        where: { indicatorId: indicator.id, retiredAt: { not: null } },
        orderBy: { retiredAt: 'asc' },
        include: {
          dataset: {
            select: { title: true, provider: { select: { acronym: true } } },
          },
          retiredBy: { select: { name: true } },
        },
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
      // L'échelle où les valeurs se comparent : la France, ou une région à la fois.
      comparisonScale: indicator.comparisonScale,
      regions: await regionsOf(this.prisma, where),
      // La lecture en mots simples.
      question: indicator.question,
      readingTemplate: indicator.readingTemplate,
      scaleLow: indicator.scaleLow,
      scaleHigh: indicator.scaleHigh,
      categories: indicator.categories,
      periods: periods.map((p) => p.period),
      territoryLevels: levels.map((l) => l.level),
      provenance: provenancesOf(loaded),
      // Les sources que l'équipe a retirées : qui, quand, pourquoi. Leurs
      // valeurs ne s'affichent plus pour cet indicateur.
      retiredSources: retired.map((s) => ({
        producer: s.dataset.provider.acronym,
        dataset: s.dataset.title,
        retiredAt: s.retiredAt,
        retiredBy: s.retiredBy?.name ?? null,
        reason: s.retiredReason,
      })),
    };
  }
}

/** Les régions où l'indicateur a des valeurs, avec leur nom officiel. */
async function regionsOf(
  prisma: PrismaService,
  where: { indicatorId: string; versionId: { in: string[] } },
) {
  const codes = (
    await prisma.territory.findMany({
      where: { observations: { some: where }, regionCode: { not: null } },
      distinct: ['regionCode'],
      select: { regionCode: true },
    })
  ).map((t) => t.regionCode!);
  const names = await prisma.territory.findMany({
    where: { level: 'region', code: { in: codes } },
    orderBy: { vintage: 'desc' },
    select: { code: true, name: true },
  });
  return codes
    .map((code) => ({
      code,
      name: names.find((n) => n.code === code)?.name ?? code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
