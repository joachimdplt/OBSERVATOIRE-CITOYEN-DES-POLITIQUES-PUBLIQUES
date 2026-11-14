/**
 * La collecte quotidienne des textes déposés, en ligne de commande, pour une
 * tâche planifiée (cron) :
 *
 *   npm run collect:parliament
 *
 * Elle agit au nom du premier compte d'administration, inscrit comme auteur
 * de la collecte. Relancée, elle n'ajoute que les nouveaux dépôts.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { AssembleeOpenData } from '../adapters/assemblee/assemblee-open-data';
import { collectParliamentTexts } from '../features/politics/collect-parliament-texts/collect-parliament-texts';
import { PrismaClient } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';

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
    const report = await collectParliamentTexts(
      prisma as unknown as PrismaService,
      new AssembleeOpenData(),
      admin.id,
    );
    console.log(
      `${report.examined} textes lus, ${report.matched} retenus, ${report.collected} nouveaux, ${report.articles} articles cités.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
