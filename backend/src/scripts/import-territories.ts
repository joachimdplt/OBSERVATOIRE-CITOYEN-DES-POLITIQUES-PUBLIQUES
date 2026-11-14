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

/**
 * Le dossier de chaque millésime sur le site de l'INSEE, et le préfixe de ses
 * fichiers : `v_commune_2023.csv` depuis 2023, `commune_2022.csv` avant.
 */
const INSEE_FOLDERS: Record<number, { folder: string; prefix: string }> = {
  2022: { folder: '6051727', prefix: '' },
  2023: { folder: '6800675', prefix: 'v_' },
  2024: { folder: '7766585', prefix: 'v_' },
  2025: { folder: '8377162', prefix: 'v_' },
  2026: { folder: '8740222', prefix: 'v_' },
};

async function fetchFile(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  return { url, content: await res.text() };
}

async function main() {
  const year = Number(process.argv[2]);
  const source = INSEE_FOLDERS[year] as
    (typeof INSEE_FOLDERS)[number] | undefined;
  if (!source) {
    console.error(
      `Usage : npm run territories:import -- <${Object.keys(INSEE_FOLDERS).join('|')}>`,
    );
    process.exit(1);
  }
  const base = `https://www.insee.fr/fr/statistiques/fichier/${source.folder}`;
  const file = (kind: string) => `${base}/${source.prefix}${kind}_${year}.csv`;
  const [regions, departments, communes] = await Promise.all([
    fetchFile(file('region')),
    fetchFile(file('departement')),
    fetchFile(file('commune')),
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
