/**
 * Le bon sujet donné par une personne à un rangement refusé : il devient un
 * rangement de personne, validé et signé. Si ce sujet existe déjà pour la
 * même unité, ses passages s'y ajoutent. Partagé par la vérification et la
 * relecture, à la racine de la ressource pour qu'aucune slice n'en importe
 * une autre.
 */
import type { Prisma } from '../../generated/prisma/client';
import {
  DecisionMode,
  LabelOrigin,
  LabelStatus,
} from '../../generated/prisma/enums';

export async function fileCorrection(
  tx: Prisma.TransactionClient,
  label: {
    candidateId: string;
    documentUrl: string;
    heading: string;
    unit: string;
    fromPosition: number | null;
    positions: number[];
  },
  code: string,
  signed: { decidedById: string; decidedAt: Date; reason?: string | null },
) {
  const key = {
    candidateId: label.candidateId,
    documentUrl: label.documentUrl,
    heading: label.heading,
    capCode: code,
    unit: label.unit,
  };
  const decision = {
    ...signed,
    status: LabelStatus.validated,
    decisionMode: DecisionMode.person,
  };
  await tx.capLabel.upsert({
    where: { candidateId_documentUrl_heading_capCode_unit: key },
    create: {
      ...key,
      fromPosition: label.fromPosition,
      // Rangés un par un, ses passages suivent dans le nouveau sujet.
      positions: label.positions,
      origin: LabelOrigin.person,
      ...decision,
    },
    update: { ...decision, positions: { push: label.positions } },
  });
}
