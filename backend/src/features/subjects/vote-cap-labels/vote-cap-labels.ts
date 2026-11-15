import { currentCaptures } from '../../../domain/programme';
import { documentName } from '../../../domain/programme-reading';
import {
  mean,
  nearestTopic,
  neighboursTopic,
  toVector,
  vote,
  type Proposal,
} from '../../../domain/vote';
import {
  DocumentKind,
  LabelOrigin,
  LabelStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

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

/**
 * Le vote sur les rangements déjà faits par le modèle : la grille et les
 * voisins donnent leur sujet ; d'accord avec le modèle, le rangement reste
 * affiché ; sinon il part en relecture, avec les trois propositions.
 */
export async function voteCapLabels(
  prisma: PrismaService,
  log: (line: string) => void = () => {},
) {
  const ctx = await loadVoteContext(prisma);
  const labels = await prisma.capLabel.findMany({
    where: {
      origin: LabelOrigin.model,
      status: { in: [LabelStatus.proposed, LabelStatus.review] },
    },
    include: { candidate: { select: { name: true } } },
  });
  // Le classement du candidat : le titre de son document, et ce titre avec
  // la rubrique de l'extrait, chacun rapproché du sujet le plus proche.
  const titles = new Map(
    (
      await prisma.politicalDocument.findMany({
        where: { url: { in: [...new Set(labels.map((l) => l.documentUrl))] } },
        select: { url: true, title: true },
      })
    ).map((d) => [d.url, documentName(d.title)]),
  );
  const texts = [
    ...new Set(
      labels.flatMap((l) => {
        const t = titles.get(l.documentUrl) ?? '';
        return [t, `${t} — ${l.heading}`];
      }),
    ),
  ];
  log(`Vectorisation de ${texts.length} titres et rubriques…`);
  const embedded = await embedTexts(texts);
  const topicOfText = new Map(
    texts.map((t, i) => [t, nearestTopic(embedded[i], ctx.topicVectors)]),
  );
  const report = { voted: 0, agreed: 0, review: 0, skipped: 0 };
  for (const l of labels) {
    const v = ctx.vectorOf(ctx.blockOf(l));
    if (!v) {
      report.skipped++;
      continue;
    }
    const proposals: Proposal[] = [
      { method: 'grille', code: nearestTopic(v, ctx.topicVectors) },
      {
        method: 'voisins',
        code: neighboursTopic(v, ctx.known, `${l.candidateId}\n${l.heading}`),
      },
      { method: 'modele', code: l.capCode },
      {
        method: 'titre',
        code: topicOfText.get(titles.get(l.documentUrl) ?? '') ?? null,
      },
      {
        method: 'rubrique',
        code:
          topicOfText.get(
            `${titles.get(l.documentUrl) ?? ''} — ${l.heading}`,
          ) ?? null,
      },
    ];
    const result = vote(proposals);
    await prisma.capLabel.update({
      where: { id: l.id },
      data: {
        proposals,
        status: result.agreed ? LabelStatus.proposed : LabelStatus.review,
      },
    });
    report.voted++;
    if (result.agreed) report.agreed++;
    else report.review++;
    log(
      `[${report.voted}/${labels.length}] ${l.candidate.name} · ${l.heading.slice(0, 50)} → ${
        result.agreed
          ? `d’accord (${l.capCode})`
          : `à relire (${proposals.map((p) => p.code ?? '?').join(' / ')})`
      }`,
    );
  }
  return report;
}
