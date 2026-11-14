import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  PUBLIC_STATES,
  PUBLICATION_LABELS,
  type PublicState,
} from '../../../domain/publication';
import { TerritoryLevel } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Un visiteur clique sur une commune de la carte : toutes les couches
 * publiées pour ce territoire, chacune avec ses valeurs par période, son
 * producteur et son étiquette de relecture. Une fiche par territoire, quelle
 * que soit la couche affichée.
 */
@Controller('public/territories')
export class ListTerritoryValuesController {
  constructor(private prisma: PrismaService) {}

  @Get(':level/:code/values')
  async values(
    @Param('level', new ParseEnumPipe(TerritoryLevel)) level: TerritoryLevel,
    @Param('code') code: string,
  ) {
    const territories = await this.prisma.territory.findMany({
      where: { level, code: code.toUpperCase() },
      orderBy: { vintage: 'desc' },
      select: { id: true, name: true, code: true, level: true },
    });
    if (territories.length === 0)
      throw new NotFoundException('Territoire inconnu');

    const observations = await this.prisma.observation.findMany({
      where: {
        territoryId: { in: territories.map((t) => t.id) },
        version: { state: { in: PUBLIC_STATES } },
      },
      orderBy: { period: 'asc' },
      include: {
        version: {
          select: {
            state: true,
            vintage: true,
            dataset: { select: { provider: { select: { acronym: true } } } },
          },
        },
        indicator: {
          select: {
            code: true,
            label: true,
            unit: true,
            pillar: true,
            kind: true,
            categories: true,
            limits: true,
            question: true,
            readingTemplate: true,
          },
        },
      },
    });

    const layers = new Map<string, ReturnType<typeof layerOf>>();
    for (const o of observations) {
      const layer = layers.get(o.indicator.code) ?? layerOf(o.indicator);
      // La source de la valeur : la DREES, ou l'ARS de la région de la commune.
      layer.indicator.producers.add(o.version.dataset.provider.acronym);
      layer.values.push({
        period: o.period,
        status: o.status,
        value: o.value?.toString() ?? null,
        category: o.category,
        // La ligne du fichier du producteur d'où vient la valeur.
        sourceRow: o.rowNumber,
        // La date du texte d'où vient la valeur, quand le fichier la donne
        // (l'arrêté de zonage de la région, par exemple).
        referenceDate: o.referenceDate?.toISOString().slice(0, 10) ?? null,
        publication: {
          status: o.version.state,
          label: PUBLICATION_LABELS[o.version.state as PublicState],
        },
      });
      layers.set(o.indicator.code, layer);
    }

    const { name, level: territoryLevel } = territories[0];
    return {
      territory: { code: code.toUpperCase(), level: territoryLevel, name },
      layers: [...layers.values()].map(
        ({ indicator: { producers, ...indicator }, values }) => ({
          indicator: { ...indicator, producer: [...producers].join(', ') },
          values,
        }),
      ),
    };
  }
}

type IndicatorView = {
  code: string;
  label: string;
  unit: string;
  pillar: string;
  kind: string;
  categories: unknown;
  limits: string;
  question: string | null;
  readingTemplate: string | null;
};

const layerOf = (i: IndicatorView) => ({
  indicator: {
    code: i.code,
    label: i.label,
    unit: i.unit,
    pillar: i.pillar,
    kind: i.kind,
    categories: i.categories,
    limits: i.limits,
    question: i.question,
    readingTemplate: i.readingTemplate,
    producers: new Set<string>(),
  },
  values: [] as {
    period: string;
    status: string;
    value: string | null;
    category: string | null;
    sourceRow: number;
    referenceDate: string | null;
    publication: { status: string; label: string };
  }[],
});
