/**
 * La nomenclature COFOG, en français, lue chez Eurostat :
 *
 *   npm run cofog:import
 *
 * Relancée, elle met à jour les libellés sans rien effacer.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { readCofog } from '../domain/cofog';
import { PrismaClient } from '../generated/prisma/client';

const SOURCE =
  'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/codelist/ESTAT/COFOG99/latest?format=TSV&lang=fr';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`Eurostat : ${res.status}`);
    const entries = readCofog(await res.text());
    // Les fonctions d'abord, pour que chaque sous-fonction trouve son parent.
    for (const e of [...entries].sort((a, b) => a.level - b.level)) {
      const data = {
        display: e.display,
        level: e.level,
        parentCode: e.parentCode,
        label: e.label,
        source: SOURCE,
        importedAt: new Date(),
      };
      await prisma.cofogFunction.upsert({
        where: { code: e.code },
        update: data,
        create: { code: e.code, ...data },
      });
    }
    const divisions = entries.filter((e) => e.level === 1).length;
    console.log(
      `${divisions} fonctions, ${entries.length - divisions} sous-fonctions importées.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
