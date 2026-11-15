import { NotFoundException } from '@nestjs/common';
import {
  CONTENT_LICENSE,
  PUBLIC_STATES,
  DATA_LABELS,
  type PublicState,
} from '../../domain/publication';
import type { PrismaService } from '../../prisma/prisma.service';

/** Les versions visibles du public d'un jeu, avec leurs signataires. */
const publicVersions = {
  where: { state: { in: PUBLIC_STATES } },
  orderBy: { vintage: 'desc' as const },
  include: {
    submittedBy: { select: { name: true } },
    reviewedBy: { select: { name: true } },
  },
};

/**
 * Un indicateur tel que le public peut le lire : sa définition, et les
 * versions visibles de chacune de ses sources (une par millésime et par jeu,
 * publiée ou prépubliée). Sans aucune version visible, l'indicateur n'existe
 * pas pour le public : un brouillon ne se devine pas.
 */
export async function loadPublicIndicator(prisma: PrismaService, code: string) {
  const indicator = await prisma.indicatorDefinition.findUnique({
    where: { code },
    include: {
      // Seules les sources actives nourrissent l'indicateur.
      sources: {
        where: { retiredAt: null },
        include: {
          dataset: { include: { provider: true, versions: publicVersions } },
        },
      },
    },
  });
  const versions =
    indicator?.sources.flatMap(({ dataset }) =>
      dataset.versions.map((version) => ({ ...version, dataset })),
    ) ?? [];
  if (!indicator || versions.length === 0) {
    throw new NotFoundException('Indicateur inconnu');
  }
  versions.sort((a, b) => b.vintage.localeCompare(a.vintage));
  return { indicator, versions };
}

type Loaded = Awaited<ReturnType<typeof loadPublicIndicator>>;
type PublicVersion = Loaded['versions'][number];

/**
 * La provenance d'une version, jointe à chaque valeur montrée au public : le
 * producteur, le jeu, le fichier d'origine, l'état de relecture avec ses
 * signataires, et les licences.
 */
export function provenanceOf(version: PublicVersion) {
  const { dataset } = version;
  const state = version.state as PublicState;
  return {
    status: state,
    statusLabel: DATA_LABELS[state],
    producer: {
      name: dataset.provider.name,
      acronym: dataset.provider.acronym,
      url: dataset.provider.officialUrl,
    },
    dataset: {
      title: dataset.title,
      producerRef: dataset.producerRef,
      url: dataset.url,
      methodology: dataset.methodology,
    },
    version: {
      vintage: version.vintage,
      fileUrl: version.fileUrl,
      fileHash: version.fileHash,
      collectedAt: version.collectedAt,
      publishedAt: version.publishedAt,
      authoredBy: version.submittedBy?.name ?? null,
      reviewedBy: version.reviewedBy?.name ?? null,
    },
    licenses: {
      content: CONTENT_LICENSE,
      data: { name: dataset.license, holder: dataset.provider.acronym },
    },
  };
}

/** La provenance de chaque version visible, la plus récente en premier. */
export const provenancesOf = (loaded: Loaded) =>
  loaded.versions.map((v) => provenanceOf(v));

/** Les producteurs d'un indicateur, chacun une fois. */
export const producersOf = (loaded: Loaded) => [
  ...new Set(loaded.versions.map((v) => v.dataset.provider.acronym)),
];
