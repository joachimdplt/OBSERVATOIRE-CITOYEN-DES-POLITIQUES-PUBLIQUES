import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseEnumPipe,
} from '@nestjs/common';
import { type Category, categoryReadingIn } from '../../../domain/category';
import {
  PUBLIC_STATES,
  DATA_LABELS,
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
      select: {
        id: true,
        name: true,
        code: true,
        level: true,
        regionCode: true,
        departmentCode: true,
      },
    });
    if (territories.length === 0)
      throw new NotFoundException('Territoire inconnu');
    // Ce qui ne se publie que par département (l'âge des médecins) se lit
    // aussi dans la fiche de la commune, avec le nom du département.
    const departmentCode = territories[0].departmentCode;
    const departments =
      departmentCode && level !== TerritoryLevel.department
        ? await this.prisma.territory.findMany({
            where: { level: TerritoryLevel.department, code: departmentCode },
            orderBy: { vintage: 'desc' },
            select: { id: true, name: true, code: true },
          })
        : [];

    const observations = await this.prisma.observation.findMany({
      where: {
        territoryId: {
          in: [...territories, ...departments].map((t) => t.id),
        },
        version: { state: { in: PUBLIC_STATES } },
      },
      orderBy: { period: 'asc' },
      include: {
        territory: { select: { level: true, code: true, name: true } },
        version: {
          select: {
            state: true,
            vintage: true,
            datasetId: true,
            dataset: {
              select: {
                id: true,
                title: true,
                provider: { select: { acronym: true } },
              },
            },
          },
        },
        indicator: {
          select: {
            code: true,
            sources: {
              where: { retiredAt: null },
              select: { datasetId: true },
            },
            label: true,
            unit: true,
            pillar: true,
            kind: true,
            categories: true,
            limits: true,
            question: true,
            readingTemplate: true,
            mapLayer: true,
          },
        },
      },
    });

    const layers = new Map<string, ReturnType<typeof layerOf>>();
    for (const o of observations) {
      // Une valeur d'une source retirée ne nourrit plus l'indicateur.
      if (!o.indicator.sources.some((s) => s.datasetId === o.version.datasetId))
        continue;
      const layer =
        layers.get(o.indicator.code) ??
        layerOf(o.indicator, territories[0].regionCode, o.territory, {
          id: o.version.dataset.id,
          title: o.version.dataset.title,
        });
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
          label: DATA_LABELS[o.version.state as PublicState],
        },
      });
      layers.set(o.indicator.code, layer);
    }

    const { name, level: territoryLevel } = territories[0];
    return {
      territory: { code: code.toUpperCase(), level: territoryLevel, name },
      layers: [...layers.values()].map(
        ({
          indicator: { producers, ...indicator },
          values,
          scope,
          dataset,
        }) => ({
          indicator: { ...indicator, producer: [...producers].join(', ') },
          scope,
          dataset,
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
  mapLayer: boolean;
};

// Une catégorie se lit dans le sens de la région du territoire.
const layerOf = (
  i: IndicatorView,
  regionCode: string | null,
  // Le territoire des valeurs : la commune, ou son département.
  scope: { level: string; code: string; name: string },
  // Le jeu de données d'où vient la couche : les tranches d'âge d'un même
  // jeu se lisent ensemble, sous son titre.
  dataset: { id: string; title: string },
) => ({
  scope,
  dataset,
  indicator: {
    code: i.code,
    label: i.label,
    unit: i.unit,
    pillar: i.pillar,
    kind: i.kind,
    categories:
      (i.categories as Category[] | null)?.map((c) => ({
        code: c.code,
        ...categoryReadingIn(c, regionCode),
      })) ?? null,
    limits: i.limits,
    question: i.question,
    readingTemplate: i.readingTemplate,
    // Faux : un élément de contexte, lu après les couches de la carte.
    mapLayer: i.mapLayer,
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
