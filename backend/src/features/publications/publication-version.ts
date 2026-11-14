import { NotFoundException } from '@nestjs/common';
import { PUBLIC_STATES } from '../../domain/publication';
import type { PublicationContent } from '../../domain/publication-content';
import type { Prisma } from '../../generated/prisma/client';
import { ReviewAction, VersionState } from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

/** Une version de publication avec ses maillons et leurs indicateurs, dans l'ordre. */
export async function loadPublicationVersion(db: Db, id: string) {
  const version = await db.publicationVersion.findUnique({
    where: { id },
    include: {
      publication: true,
      sections: {
        orderBy: { position: 'asc' },
        include: {
          indicators: {
            orderBy: { position: 'asc' },
            include: { indicator: { select: { code: true } } },
          },
        },
      },
    },
  });
  if (!version) throw new NotFoundException('Version de publication inconnue');
  return version;
}

type LoadedVersion = Awaited<ReturnType<typeof loadPublicationVersion>>;

/** Le texte d'une version, dans la forme que le domaine contrôle. */
export const contentOf = (v: LoadedVersion): PublicationContent => ({
  title: v.title,
  summary: v.summary,
  sections: v.sections.map((s) => ({
    title: s.title,
    text: s.text,
    indicators: s.indicators.map((x) => ({
      code: x.indicator.code,
      justification: x.justification,
    })),
  })),
});

type Snapshot = {
  state: string;
  submittedById: string | null;
  reviewedById: string | null;
  publishedAt: Date | null;
};

/** Écrire la trace d'un geste sur une version de publication, dans sa transaction. */
export function recordPublicationEvent(
  tx: Prisma.TransactionClient,
  event: {
    actorId: string;
    action: ReviewAction;
    versionId: string;
    before: Snapshot;
    after: Snapshot;
    justification?: string | null;
  },
) {
  const snap = (v: Snapshot) => ({
    state: v.state,
    submittedById: v.submittedById,
    reviewedById: v.reviewedById,
    publishedAt: v.publishedAt?.toISOString() ?? null,
  });
  return tx.reviewEvent.create({
    data: {
      actorId: event.actorId,
      action: event.action,
      subjectType: 'publication_version',
      subjectId: event.versionId,
      before: snap(event.before),
      after: snap(event.after),
      justification: event.justification ?? null,
    },
  });
}

/**
 * La version que le public lisait passe à « remplacée » quand une autre
 * version de la même publication devient publique. Elle ne s'efface pas.
 */
export async function supersedePublicPublication(
  tx: Prisma.TransactionClient,
  replacement: { id: string; publicationId: string; number: number },
  actorId: string,
) {
  const current = await tx.publicationVersion.findFirst({
    where: {
      publicationId: replacement.publicationId,
      state: { in: PUBLIC_STATES },
      id: { not: replacement.id },
    },
  });
  if (!current) return;
  const replaced = await tx.publicationVersion.update({
    where: { id: current.id },
    data: { state: VersionState.superseded },
  });
  await recordPublicationEvent(tx, {
    actorId,
    action: ReviewAction.superseded,
    versionId: current.id,
    before: current,
    after: replaced,
    justification: `Remplacée par la version n° ${replacement.number}.`,
  });
}
