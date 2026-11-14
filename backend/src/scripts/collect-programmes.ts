/**
 * La collecte des programmes des candidats, en ligne de commande, pour une
 * tâche planifiée (cron) :
 *
 *   npm run collect:programmes
 *
 * Elle relit chaque adresse indiquée par l'équipe. Un programme dont le texte
 * n'a pas changé n'est pas recollecté ; un texte changé entre comme un
 * nouveau document. pdftotext (poppler) doit être installé.
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { WebProgrammeReader } from '../adapters/programmes/web-programme-reader';
import configuration from '../config/configuration';
import { collectProgrammes } from '../features/programmes/collect-programmes/collect-programmes';
import { PrismaClient } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { RawFileStore } from '../storage/raw-file-store';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const admin = await prisma.user.findFirst({
      where: { role: Role.admin, active: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) throw new Error('Aucun compte d’administration actif.');
    const store = new RawFileStore(new ConfigService(configuration()));
    const report = await collectProgrammes(
      prisma as unknown as PrismaService,
      new WebProgrammeReader(),
      (bytes) => store.keep(bytes),
      admin.id,
    );
    console.log(
      `${report.pages} pages lues, ${report.unchanged} inchangées, ${report.collected} nouvelles, ${report.passages} passages, ${report.matches} rattachements.`,
    );
    for (const f of report.failed) console.log(`Échec : ${f}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
