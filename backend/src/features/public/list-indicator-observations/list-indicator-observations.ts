import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TerritoryLevel } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { loadPublicIndicator, provenanceOf } from '../public-indicator';

const MAX_PAGE = 1000;

/**
 * Un visiteur lit les valeurs d'un indicateur, filtrées par niveau
 * géographique, territoire et période, avec leur provenance.
 *
 * Une absence se lit comme telle : `value` vide et un statut qui dit pourquoi
 * (non documentée, secret statistique, sans objet). Jamais un zéro.
 * Chaque valeur donne aussi la ligne du fichier d'origine.
 */
@Controller('public/indicators')
export class ListIndicatorObservationsController {
  constructor(private prisma: PrismaService) {}

  @Get(':code/observations')
  async list(
    @Param('code') code: string,
    @Query('level', new ParseEnumPipe(TerritoryLevel, { optional: true }))
    level?: TerritoryLevel,
    @Query('territory') territory?: string,
    @Query('period') period?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit = 100,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    const loaded = await loadPublicIndicator(this.prisma, code);
    const where = {
      indicatorId: loaded.indicator.id,
      versionId: loaded.version.id,
      ...(period ? { period } : {}),
      ...(level || territory
        ? {
            territory: {
              ...(level ? { level } : {}),
              ...(territory ? { code: territory.toUpperCase() } : {}),
            },
          }
        : {}),
    };
    const take = Math.min(Math.max(limit, 1), MAX_PAGE);
    const [total, observations] = await Promise.all([
      this.prisma.observation.count({ where }),
      this.prisma.observation.findMany({
        where,
        orderBy: [{ territory: { code: 'asc' } }, { period: 'asc' }],
        skip: Math.max(offset, 0),
        take,
        include: {
          territory: {
            select: { level: true, code: true, name: true, vintage: true },
          },
        },
      }),
    ]);

    return {
      indicator: {
        code: loaded.indicator.code,
        label: loaded.indicator.label,
        unit: loaded.indicator.unit,
      },
      total,
      limit: take,
      offset: Math.max(offset, 0),
      observations: observations.map((o) => ({
        territory: o.territory,
        period: o.period,
        status: o.status,
        value: o.value?.toString() ?? null,
        sourceRow: o.rowNumber,
      })),
      provenance: provenanceOf(loaded),
    };
  }
}
