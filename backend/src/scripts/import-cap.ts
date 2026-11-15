/**
 * La grille des sujets du Comparative Agendas Project, lue sur sa page
 * officielle, avec les intitulés français de l'équipe :
 *
 *   npm run cap:import
 *
 * Relancée, elle met à jour les intitulés et descriptions sans rien effacer.
 * Elle s'arrête si un sujet n'a pas d'intitulé français.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { parse } from 'node-html-parser';
import { CAP_FR, readCapCodebook } from '../domain/cap';
import { PrismaClient } from '../generated/prisma/client';

const SOURCE = 'https://www.comparativeagendas.net/pages/master-codebook';

async function main() {
  const res = await fetch(SOURCE, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) Chrome/130' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`CAP : ${res.status}`);
  const html = await res.text();
  const root = parse(html, {
    blockTextElements: { script: false, style: false },
  });
  // Le texte de la page, un bloc par ligne.
  root.querySelectorAll('br, p, div, h1, h2, h3, h4, li').forEach((e) => {
    e.insertAdjacentHTML('afterend', '\n');
  });
  const text = root.text;
  const version =
    /Master Topics Codebook Version\s+([\d.]+)/i.exec(text)?.[1] ?? 'inconnue';
  const entries = readCapCodebook(text);
  if (entries.length < 200)
    throw new Error(`Grille incomplète : ${entries.length} sujets lus.`);
  const missing = entries.filter((e) => !CAP_FR[e.code]).map((e) => e.code);
  if (missing.length)
    throw new Error(`Sujets sans intitulé français : ${missing.join(', ')}`);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    // Les grands sujets d'abord, pour que chaque sous-sujet trouve le sien.
    for (const e of [...entries].sort((a, b) => a.level - b.level)) {
      const data = {
        level: e.level,
        majorCode: e.majorCode,
        title: e.title,
        description: e.description,
        labelFr: CAP_FR[e.code],
        source: SOURCE,
        version,
        importedAt: new Date(),
      };
      await prisma.capTopic.upsert({
        where: { code: e.code },
        update: data,
        create: { code: e.code, ...data },
      });
    }
    const majors = entries.filter((e) => e.level === 1).length;
    console.log(
      `Grille CAP ${version} : ${majors} grands sujets, ${entries.length - majors} sous-sujets.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
