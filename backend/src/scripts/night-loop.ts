/**
 * La boucle de nuit : lecture des programmes, rangement dans les sujets
 * (vote, classeur, relecture des désaccords), puis un rapport, et ainsi de
 * suite jusqu'au matin.
 *
 *   npx tsx src/scripts/night-loop.ts [heure de fin, 7 par défaut] [minutes entre deux tours, 60]
 *
 * Chaque rapport s'ajoute à reports/nuit-AAAA-MM-JJ.md.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const END_HOUR = Number(process.argv[2] ?? 7);
const PAUSE_MIN = Number(process.argv[3] ?? 60);

/** Lance une commande npm, montre sa sortie, et rend ses dernières lignes. */
function run(script: string): Promise<{ ok: boolean; tail: string[] }> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    const child = spawn('npm', ['run', '-s', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const take = (b: Buffer) => {
      const text = b.toString();
      process.stdout.write(text);
      lines.push(...text.split('\n').filter((l) => l.trim()));
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('close', (code) =>
      resolve({ ok: code === 0, tail: lines.slice(-3) }),
    );
  });
}

async function stats(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<
    { name: string; status: string; subjects: bigint; review: bigint }[]
  >`
    select c.name, c."programmeStatus"::text as status,
      count(distinct l."capCode") filter (where l.status in ('proposed','validated')) as subjects,
      count(*) filter (where l.status = 'review') as review
    from candidates c left join cap_labels l on l."candidateId" = c.id
    group by 1, 2 order by 3 desc, 1`;
  return rows;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  mkdirSync('reports', { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const file = `reports/nuit-${day}.md`;
  appendFileSync(
    file,
    `# Nuit du ${day}\n\nFin prévue à ${END_HOUR} h, un tour toutes les ${PAUSE_MIN} minutes.\n`,
  );
  for (let turn = 1; ; turn++) {
    const started = new Date();
    console.log(
      `\n===== Tour ${turn} · ${started.toLocaleTimeString('fr-FR')} =====\n`,
    );
    const collect = await run('collect:programmes');
    const filing = await run('cap:suggest');
    const s = await stats(prisma);
    const review = s.reduce((n, r) => n + Number(r.review), 0);
    const report = [
      `\n## Tour ${turn} · ${started.toLocaleTimeString('fr-FR')}`,
      `- Lecture : ${collect.ok ? collect.tail.at(-1) : 'ÉCHEC — ' + collect.tail.join(' ')}`,
      `- Rangement : ${filing.ok ? filing.tail.at(-1) : 'ÉCHEC — ' + filing.tail.join(' ')}`,
      `- À relire par l’équipe : ${review} extraits`,
      `- Sujets couverts, sur 21 :`,
      ...s.map(
        (r) =>
          `  - ${r.name} (${r.status}) : ${Number(r.subjects)}${Number(r.review) ? `, ${Number(r.review)} à relire` : ''}`,
      ),
      `- Durée du tour : ${Math.round((Date.now() - started.getTime()) / 60000)} min`,
    ].join('\n');
    appendFileSync(file, report + '\n');
    console.log(report);
    const next = new Date(Date.now() + PAUSE_MIN * 60000);
    if (next.getHours() >= END_HOUR && next.getHours() < 12) {
      console.log(`\nFin de la nuit. Rapport complet : ${file}`);
      break;
    }
    console.log(`\nProchain tour à ${next.toLocaleTimeString('fr-FR')}…`);
    await new Promise((r) => setTimeout(r, PAUSE_MIN * 60000));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
