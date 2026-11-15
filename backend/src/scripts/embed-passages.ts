/**
 * La vectorisation des passages des programmes en vigueur, une fois pour
 * toutes :
 *
 *   npm run embed
 *
 * Ollama doit tourner avec le modèle (ollama pull bge-m3). Un passage déjà
 * vectorisé par ce modèle ne l'est pas de nouveau ; une relance reprend où
 * la précédente s'était arrêtée.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { currentCaptures } from '../domain/programme';
import { PrismaClient } from '../generated/prisma/client';
import { DocumentKind } from '../generated/prisma/enums';

const MODEL = process.env.EMBEDDING_MODEL ?? 'bge-m3';
const URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const BATCH = 32;

/** Les vecteurs de quelques textes, calculés par Ollama. */
async function embed(input: string[]): Promise<number[][]> {
  const res = await fetch(`${URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input }),
  });
  if (!res.ok) throw new Error(`Ollama : ${res.status} ${await res.text()}`);
  return ((await res.json()) as { embeddings: number[][] }).embeddings;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    // D'abord la grille : chaque sujet et sous-sujet, par son intitulé
    // français, son intitulé anglais et sa définition officielle.
    const topics = await prisma.capTopic.findMany();
    const vectorized = new Set(
      (
        await prisma.topicVector.findMany({
          where: { model: MODEL },
          select: { code: true },
        })
      ).map((t) => t.code),
    );
    const grid = topics.filter((t) => !vectorized.has(t.code));
    for (let i = 0; i < grid.length; i += BATCH) {
      const batch = grid.slice(i, i + BATCH);
      const vectors = await embed(
        batch.map((t) =>
          [t.labelFr, t.title, t.description].filter(Boolean).join(' : '),
        ),
      );
      await prisma.topicVector.createMany({
        data: batch.map((t, k) => ({
          code: t.code,
          model: MODEL,
          vector: Buffer.from(new Float32Array(vectors[k]).buffer),
        })),
        skipDuplicates: true,
      });
      console.log(
        `[grille ${Math.min(i + BATCH, grid.length)}/${grid.length}] ${batch[0].labelFr}`,
      );
    }

    const documents = await prisma.politicalDocument.findMany({
      where: {
        kind: DocumentKind.programme,
        sourceRef: { not: null },
        retiredAt: null,
      },
      select: { id: true, sourceRef: true, fetchedAt: true, createdAt: true },
    });
    const current = currentCaptures(
      documents.map((d) => ({
        id: d.id,
        sourceRef: d.sourceRef!,
        fetchedAt: d.fetchedAt ?? d.createdAt,
      })),
    );
    const measures = await prisma.measure.findMany({
      where: { documentId: { in: [...current] } },
      select: { id: true, article: true, quote: true },
    });
    const done = new Set(
      (
        await prisma.passageVector.findMany({
          where: { model: MODEL },
          select: { measureId: true },
        })
      ).map((v) => v.measureId),
    );
    const todo = measures.filter((m) => !done.has(m.id));
    console.log(
      `${todo.length} passages à vectoriser sur ${measures.length} (modèle ${MODEL})`,
    );
    const started = Date.now();
    for (let i = 0; i < todo.length; i += BATCH) {
      const batch = todo.slice(i, i + BATCH);
      // Le titre du chapitre donne le contexte du passage.
      const embeddings = await embed(
        batch.map((m) => `${m.article}\n${m.quote}`.slice(0, 2000)),
      );
      await prisma.passageVector.createMany({
        data: batch.map((m, k) => ({
          measureId: m.id,
          model: MODEL,
          vector: Buffer.from(new Float32Array(embeddings[k]).buffer),
        })),
        skipDuplicates: true,
      });
      const count = Math.min(i + BATCH, todo.length);
      const left = Math.round(
        (((Date.now() - started) / count) * (todo.length - count)) / 1000,
      );
      console.log(
        `[${count}/${todo.length}, encore ~${left} s] ${batch[0].article.slice(0, 60)}`,
      );
    }
    console.log('Vectorisation terminée.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
