import { createHash } from 'node:crypto';
import type { PrismaClient } from '../../../generated/prisma/client';
import type { TerritoryRecord } from '../../../domain/territory-code';

export type CogFile = { url: string; content: string };

/**
 * L'équipe charge un millésime du Code officiel géographique.
 *
 * Un millésime se charge une fois : le COG d'une année ne change pas, et des
 * observations publiées s'y rattacheront. Le recharger serait réécrire des
 * territoires, ce que la base refuse de toute façon.
 */
export async function loadCogVintage(
  prisma: PrismaClient,
  year: number,
  files: CogFile[],
  territories: TerritoryRecord[],
) {
  if (await prisma.territoryVintage.findUnique({ where: { year } })) {
    throw new Error(`Le COG ${year} est déjà chargé.`);
  }

  const readAt = new Date().toISOString();
  const sources = files.map((f) => ({
    url: f.url,
    sha256: createHash('sha256').update(f.content).digest('hex'),
    readAt,
  }));

  await prisma.$transaction(
    async (tx) => {
      await tx.territoryVintage.create({ data: { year, sources } });
      await tx.territory.createMany({
        data: territories.map((t) => ({ ...t, vintage: year })),
      });
    },
    { timeout: 120_000 },
  );

  return { year, count: territories.length };
}
