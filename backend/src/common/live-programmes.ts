/**
 * Les documents de programme en vigueur : pour chaque source, sa lecture la
 * plus récente, ni retirée ni sans source. Le choix se fait ici, une fois ;
 * les routes publiques, le rangement, la vérification et les scripts
 * l'appellent au lieu de le refaire. Partagé ici pour qu'aucune slice n'en
 * importe une autre.
 */
import { currentCaptures } from '../domain/programme';
import type { Prisma, PrismaClient } from '../generated/prisma/client';
import { DocumentKind } from '../generated/prisma/enums';

type Dated = {
  id: string;
  sourceRef: string;
  fetchedAt: Date | null;
  createdAt: Date;
};

export async function liveProgrammes<S extends Prisma.PoliticalDocumentSelect>(
  /** Le service Nest ou le client d'un script. */
  prisma: Pick<PrismaClient, 'politicalDocument'>,
  query: {
    /** Un filtre de plus : un candidat, des adresses. */
    where?: Prisma.PoliticalDocumentWhereInput;
    select: S;
    orderBy?: Prisma.PoliticalDocumentOrderByWithRelationInput;
  },
): Promise<Prisma.PoliticalDocumentGetPayload<{ select: S }>[]> {
  const documents = await prisma.politicalDocument.findMany({
    where: {
      ...query.where,
      kind: DocumentKind.programme,
      sourceRef: { not: null },
      retiredAt: null,
    },
    select: {
      ...(query.select as Prisma.PoliticalDocumentSelect),
      id: true,
      sourceRef: true,
      fetchedAt: true,
      createdAt: true,
    },
    orderBy: query.orderBy,
  });
  const dated = documents as unknown as Dated[];
  const current = currentCaptures(
    dated.map((d) => ({
      id: d.id,
      sourceRef: d.sourceRef,
      fetchedAt: d.fetchedAt ?? d.createdAt,
    })),
  );
  return (
    documents as unknown as Prisma.PoliticalDocumentGetPayload<{ select: S }>[]
  ).filter((_, i) => current.has(dated[i].id));
}
