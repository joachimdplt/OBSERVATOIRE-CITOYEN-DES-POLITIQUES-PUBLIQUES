/**
 * Charger un millésime du Code officiel géographique, depuis le site de
 * l'INSEE.
 *
 *   npm run territories:import -- 2026
 *
 * Les adresses viennent du jeu « Code officiel géographique » sur
 * data.gouv.fr. Un nouveau millésime s'ajoute ici avec son dossier INSEE.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { readCog } from '../adapters/cog/read-cog';
import { loadCogVintage } from '../features/territories/load-cog-vintage/load-cog-vintage';
import { PrismaClient } from '../generated/prisma/client';

const INSEE_FOLDERS: Record<number, string> = {
  2025: '8377162',
  2026: '8740222',
};

async function fetchFile(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  return { url, content: await res.text() };
}

async function main() {
  const year = Number(process.argv[2]);
  const folder = INSEE_FOLDERS[year];
  if (!folder) {
    console.error(
      `Usage : npm run territories:import -- <${Object.keys(INSEE_FOLDERS).join('|')}>`,
    );
    process.exit(1);
  }
  const base = `https://www.insee.fr/fr/statistiques/fichier/${folder}`;
  const [regions, departments, communes] = await Promise.all([
    fetchFile(`${base}/v_region_${year}.csv`),
    fetchFile(`${base}/v_departement_${year}.csv`),
    fetchFile(`${base}/v_commune_${year}.csv`),
  ]);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const territories = readCog({
    regions: regions.content,
    departments: departments.content,
    communes: communes.content,
  });
  const { count } = await loadCogVintage(
    prisma,
    year,
    [regions, departments, communes],
    territories,
  );
  console.log(`COG ${year} chargé : ${count} territoires.`);
  await prisma.$disconnect();
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
