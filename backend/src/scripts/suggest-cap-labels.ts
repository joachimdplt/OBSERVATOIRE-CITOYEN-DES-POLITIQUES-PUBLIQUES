/**
 * Les propositions de sujets CAP pour chaque chapitre des programmes :
 *
 *   npm run cap:suggest
 *
 * Ollama doit tourner en local, avec le modèle (ollama pull qwen3:8b). Les
 * chapitres déjà rangés ne sont pas rangés de nouveau.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { OllamaTopicClassifier } from '../adapters/classifier/ollama-topic-classifier';
import { suggestCapLabels } from '../features/subjects/suggest-cap-labels/suggest-cap-labels';
import { PrismaClient } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const r = await suggestCapLabels(
      prisma as unknown as PrismaService,
      new OllamaTopicClassifier(),
      (line) => console.log(line),
    );
    console.log(
      `${r.chapters} chapitres, ${r.proposed} nouvellement rangés dont ${r.review} à relire (modèle ${r.model || 'aucun'}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
