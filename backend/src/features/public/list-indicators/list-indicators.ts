import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import {
  PUBLIC_STATES,
  PUBLICATION_LABELS,
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
    const indicators = await this.prisma.indicatorDefinition.findMany({
      where: {
        ...(pillar ? { pillar } : {}),
        dataset: { versions: { some: { state: { in: PUBLIC_STATES } } } },
      },
      orderBy: [{ pillar: 'asc' }, { label: 'asc' }],
      include: {
        dataset: {
          include: {
            provider: { select: { acronym: true } },
            versions: {
              where: { state: { in: PUBLIC_STATES } },
              select: { state: true, vintage: true },
            },
          },
        },
      },
    });
    return indicators.map((i) => {
      const version = i.dataset.versions[0];
      const state = version.state as PublicState;
      return {
        code: i.code,
        label: i.label,
        pillar: i.pillar,
        unit: i.unit,
        kind: i.kind,
        producer: i.dataset.provider.acronym,
        vintage: version.vintage,
        vintages: i.dataset.versions.map((v) => v.vintage),
        status: state,
        statusLabel: PUBLICATION_LABELS[state],
      };
    });
  }
}
