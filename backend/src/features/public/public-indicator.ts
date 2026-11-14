import { NotFoundException } from '@nestjs/common';
import {
  CONTENT_LICENSE,
  PUBLIC_STATES,
  PUBLICATION_LABELS,
  SOURCE_CODE,
  type PublicState,
} from '../../domain/publication';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Un indicateur tel que le public peut le lire : sa définition, et la version
 * de son jeu visible du public, publiée ou prépubliée. Sans version visible,
 * l'indicateur n'existe pas pour le public : un brouillon ne se devine pas.
 */
export async function loadPublicIndicator(prisma: PrismaService, code: string) {
  const indicator = await prisma.indicatorDefinition.findUnique({
    where: { code },
    include: {
      dataset: {
        include: {
          provider: true,
          versions: {
            where: { state: { in: PUBLIC_STATES } },
            include: {
              submittedBy: { select: { name: true } },
              reviewedBy: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  const version = indicator?.dataset.versions[0];
  if (!indicator || !version) throw new NotFoundException('Indicateur inconnu');
  return { indicator, version };
}

type Loaded = Awaited<ReturnType<typeof loadPublicIndicator>>;

/**
 * La provenance qui accompagne chaque valeur montrée au public : le
 * producteur, le jeu, le fichier d'origine, l'état de relecture avec ses
 * signataires, et les licences.
 */
export function provenanceOf({ indicator, version }: Loaded) {
  const { dataset } = indicator;
  const state = version.state as PublicState;
  return {
    status: state,
    statusLabel: PUBLICATION_LABELS[state],
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
      sourceCode: SOURCE_CODE,
    },
  };
}
