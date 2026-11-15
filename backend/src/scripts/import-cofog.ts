/**
 * La nomenclature COFOG, en français, lue chez Eurostat :
 *
 *   npm run cofog:import
 *
 * Relancée, elle met à jour les libellés sans rien effacer.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { readCofog, readCofogNotes } from '../domain/cofog';
import { PrismaClient } from '../generated/prisma/client';

/** Le manuel de l'ONU, avec les notes explicatives de chaque classe. */
const MANUAL =
  'https://unstats.un.org/unsd/publication/SeriesM/SeriesM_84E.pdf';

/** Le manuel converti en texte (pdftotext, poppler). */
async function manualText(): Promise<string> {
  const res = await fetch(MANUAL, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`ONU : ${res.status}`);
  const dir = await mkdtemp(join(tmpdir(), 'cofog-'));
  try {
    const file = join(dir, 'm84.pdf');
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    const { stdout } = await promisify(execFile)(
      'pdftotext',
      ['-layout', '-enc', 'UTF-8', file, '-'],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

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
    // Les notes explicatives, sous-fonction par sous-fonction.
    const notes = readCofogNotes(await manualText());
    let noted = 0;
    for (const e of entries.filter((x) => x.level === 2)) {
      const text = notes.get(e.display.replace(/\.(\d)$/, '.$1'));
      if (!text) continue;
      await prisma.cofogFunction.update({
        where: { code: e.code },
        data: { notes: text, notesSource: MANUAL },
      });
      noted++;
    }
    console.log(`${noted} notes explicatives lues dans le manuel de l'ONU.`);
    const divisions = entries.filter((e) => e.level === 1).length;
    console.log(
      `${divisions} fonctions, ${entries.length - divisions} sous-fonctions importées.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
