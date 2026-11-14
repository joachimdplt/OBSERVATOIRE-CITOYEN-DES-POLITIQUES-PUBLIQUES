import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Query,
} from '@nestjs/common';
import { TerritoryLevel } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { loadPublicIndicator, provenancesOf } from '../public-indicator';

/**
 * Un visiteur ouvre la carte d'un indicateur pour une période : toutes les
 * valeurs d'un niveau géographique en une réponse compacte, une ligne
 * `[code, valeur, statut]` par territoire, prête à colorer une carte.
 *
 * Une absence reste une absence (`valeur` vide, statut qui dit pourquoi) :
 * sur la carte, elle a sa propre teinte, jamais celle d'un zéro.
 */
@Controller('public/indicators')
export class GetIndicatorMapController {
  constructor(private prisma: PrismaService) {}

  @Get(':code/map')
  async map(
    @Param('code') code: string,
    @Query('period') period?: string,
    @Query('level', new ParseEnumPipe(TerritoryLevel, { optional: true }))
    level?: TerritoryLevel,
  ) {
    if (!period)
      throw new BadRequestException('Indiquez la période : ?period=2024');
    const loaded = await loadPublicIndicator(this.prisma, code);
    // Une carte de communes montre aussi les arrondissements de Paris, Lyon et Marseille.
    const levels =
      !level || level === TerritoryLevel.commune
        ? [TerritoryLevel.commune, TerritoryLevel.municipal_district]
        : [level];

    const observations = await this.prisma.observation.findMany({
      where: {
        indicatorId: loaded.indicator.id,
        versionId: { in: loaded.versions.map((v) => v.id) },
        period,
        territory: { level: { in: levels } },
      },
      select: {
        value: true,
        status: true,
        territory: { select: { code: true } },
        version: { select: { vintage: true } },
      },
    });

    return {
      indicator: {
        code: loaded.indicator.code,
        label: loaded.indicator.label,
        unit: loaded.indicator.unit,
      },
      period,
      levels,
      vintages: [...new Set(observations.map((o) => o.version.vintage))],
      values: observations.map((o) => [
        o.territory.code,
        o.value?.toString() ?? null,
        o.status,
      ]),
      provenance: provenancesOf(loaded),
    };
  }
}
