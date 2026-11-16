/**
 * Ce que le vote et le rangement des chapitres partagent : le modèle de
 * vecteurs, le calcul des vecteurs manquants, et le contexte du vote (les
 * blocs de chaque chapitre et leur sens). Partagé ici pour qu'aucune slice
 * n'en importe une autre.
 */
import { currentCaptures } from '../domain/programme';
import { mean, toVector } from '../domain/vote';
import { DocumentKind, LabelStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

/** Le modèle de vecteurs : celui qui a vectorisé les passages et la grille. */
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'bge-m3';
const OLLAMA = process.env.OLLAMA_URL ?? 'http://localhost:11434';

/** Les vecteurs de quelques textes (des titres), calculés par Ollama. */
export async function embedTexts(input: string[]): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  for (let i = 0; i < input.length; i += 32) {
    const res = await fetch(`${OLLAMA}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: input.slice(i, i + 32),
      }),
    });
    if (!res.ok) throw new Error(`Ollama : ${res.status} ${await res.text()}`);
    const { embeddings } = (await res.json()) as { embeddings: number[][] };
    out.push(...embeddings.map((e) => new Float32Array(e)));
  }
  return out;
}

/** Un bloc se lit par ses huit premiers passages. */
const BLOCK = 8;

/**
 * Les passages en vigueur qui n'ont pas encore de vecteur (un programme
 * collecté depuis) : ils sont vectorisés avant de voter.
 */
export async function embedMissingPassages(
  prisma: PrismaService,
  log: (line: string) => void = () => {},
) {
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
        where: { model: EMBEDDING_MODEL },
        select: { measureId: true },
      })
    ).map((v) => v.measureId),
  );
  const todo = measures.filter((m) => !done.has(m.id));
  if (todo.length) log(`Vectorisation de ${todo.length} nouveaux passages…`);
  for (let i = 0; i < todo.length; i += 32) {
    const batch = todo.slice(i, i + 32);
    const vectors = await embedTexts(
      batch.map((m) => `${m.article}\n${m.quote}`.slice(0, 2000)),
    );
    await prisma.passageVector.createMany({
      data: batch.map((m, k) => ({
        measureId: m.id,
        model: EMBEDDING_MODEL,
        vector: Buffer.from(new Float32Array(vectors[k]).buffer),
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Ce qu'il faut pour voter : les vecteurs des sujets de la grille, ceux des
 * passages en vigueur, et les passages déjà rangés (par une personne, ou par
 * un vote d'accord) qui servent de voisins.
 */
export async function loadVoteContext(prisma: PrismaService) {
  const topics = await prisma.capTopic.findMany();
  const majorOf = new Map(
    topics.map((t) => [t.code, t.level === 1 ? t.code : t.majorCode!]),
  );
  const topicVectors = (
    await prisma.topicVector.findMany({ where: { model: EMBEDDING_MODEL } })
  ).map((t) => ({ major: majorOf.get(t.code)!, vector: toVector(t.vector) }));

  const documents = await prisma.politicalDocument.findMany({
    where: {
      kind: DocumentKind.programme,
      sourceRef: { not: null },
      retiredAt: null,
    },
    select: {
      id: true,
      url: true,
      sourceRef: true,
      fetchedAt: true,
      createdAt: true,
    },
  });
  const current = currentCaptures(
    documents.map((d) => ({
      id: d.id,
      sourceRef: d.sourceRef!,
      fetchedAt: d.fetchedAt ?? d.createdAt,
    })),
  );
  const docOfUrl = new Map(
    documents.filter((d) => current.has(d.id)).map((d) => [d.url, d.id]),
  );
  const measures = await prisma.measure.findMany({
    where: { documentId: { in: [...docOfUrl.values()] } },
    select: { id: true, documentId: true, article: true, position: true },
  });
  const byChapter = new Map<string, typeof measures>();
  for (const m of measures) {
    const key = `${m.documentId}\n${m.article}`;
    const list = byChapter.get(key) ?? [];
    list.push(m);
    byChapter.set(key, list);
  }
  for (const list of byChapter.values())
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const vectors = new Map(
    (
      await prisma.passageVector.findMany({
        where: {
          model: EMBEDDING_MODEL,
          measureId: { in: measures.map((m) => m.id) },
        },
      })
    ).map((v) => [v.measureId, toVector(v.vector)]),
  );

  /** Les passages d'un rangement : son bloc, dans l'ordre. */
  const blockOf = (l: {
    documentUrl: string;
    heading: string;
    fromPosition: number | null;
  }) => {
    const docId = docOfUrl.get(l.documentUrl);
    return (byChapter.get(`${docId}\n${l.heading}`) ?? [])
      .filter((m) => (m.position ?? 0) >= (l.fromPosition ?? 0))
      .slice(0, BLOCK);
  };
  /** Le sens d'un bloc : la moyenne des vecteurs de ses passages. */
  const vectorOf = (block: { id: string }[]) => {
    const vs = block
      .map((m) => vectors.get(m.id))
      .filter((v): v is Float32Array => !!v);
    return vs.length ? mean(vs) : null;
  };

  // Les voisins : chaque passage d'un rangement affiché porte son sujet.
  const shown = await prisma.capLabel.findMany({
    where: { status: { in: [LabelStatus.proposed, LabelStatus.validated] } },
  });
  const known = shown.flatMap((l) =>
    blockOf(l).flatMap((m) => {
      const v = vectors.get(m.id);
      return v
        ? [
            {
              chapter: `${l.candidateId}\n${l.heading}`,
              code: l.capCode,
              vector: v,
            },
          ]
        : [];
    }),
  );
  return { topicVectors, blockOf, vectorOf, known };
}
