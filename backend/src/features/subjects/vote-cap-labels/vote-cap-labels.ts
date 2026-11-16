import { documentName } from '../../../domain/programme-reading';
import {
  nearestTopic,
  neighboursTopic,
  vote,
  type Proposal,
} from '../../../domain/vote';
import { LabelOrigin, LabelStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { embedTexts, loadVoteContext } from '../../../common/subject-vectors';

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
