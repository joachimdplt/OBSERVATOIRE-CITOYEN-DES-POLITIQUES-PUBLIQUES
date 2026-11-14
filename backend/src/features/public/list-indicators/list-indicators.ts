import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import {
  PUBLIC_STATES,
  DATA_LABELS,
  type PublicState,
} from '../../../domain/publication';
import { Pillar } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Un visiteur parcourt les indicateurs consultables, par pilier s'il le
 * souhaite. Seuls ceux dont le jeu a une version publiée ou prépubliée
 * apparaissent, chacun avec son état de relecture.
 */
@Controller('public/indicators')
export class ListIndicatorsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('pillar', new ParseEnumPipe(Pillar, { optional: true }))
    pillar?: Pillar,
  ) {
    const visible = { state: { in: PUBLIC_STATES } };
    const indicators = await this.prisma.indicatorDefinition.findMany({
      where: {
        ...(pillar ? { pillar } : {}),
        sources: {
          some: {
            retiredAt: null,
            dataset: { versions: { some: visible } },
          },
        },
      },
      orderBy: [{ pillar: 'asc' }, { label: 'asc' }],
      include: {
        sources: {
          where: { retiredAt: null },
          include: {
            dataset: {
              include: {
                provider: { select: { acronym: true } },
                versions: {
                  where: visible,
                  select: { state: true, vintage: true },
                },
              },
            },
          },
        },
      },
    });
    return indicators.map((i) => {
      const datasets = i.sources.map((s) => s.dataset);
      const versions = datasets
        .flatMap((d) => d.versions)
        .sort((a, b) => b.vintage.localeCompare(a.vintage));
      const state = versions[0].state as PublicState;
      return {
        code: i.code,
        label: i.label,
        pillar: i.pillar,
        unit: i.unit,
        kind: i.kind,
        comparisonScale: i.comparisonScale,
        mapLayer: i.mapLayer,
        question: i.question,
        // Un producteur pour l'APL ; une ARS par région pour le zonage.
        producer: [
          ...new Set(
            datasets
              .filter((d) => d.versions.length > 0)
              .map((d) => d.provider.acronym),
          ),
        ].join(', '),
        vintage: versions[0].vintage,
        vintages: [...new Set(versions.map((v) => v.vintage))],
        status: state,
        statusLabel: DATA_LABELS[state],
      };
    });
  }
}
