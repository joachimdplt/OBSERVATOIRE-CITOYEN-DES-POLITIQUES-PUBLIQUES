import { Controller, Get } from '@nestjs/common';
import { currentCaptures } from '../../../domain/programme';
import { DocumentKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

type Match = {
  measure: {
    document: {
      candidate: { slug: string; name: string; photoUrl: string | null } | null;
    };
  };
};

/** Pour un enjeu : chaque candidat qui en parle et son nombre de passages, le plus grand d'abord. */
function perCandidate(matches: Match[]) {
  const counts = new Map<
    string,
    { slug: string; name: string; photo: string | null; passages: number }
  >();
  for (const m of matches) {
    const c = m.measure.document.candidate;
    if (!c) continue;
    const seen = counts.get(c.slug) ?? {
      slug: c.slug,
      name: c.name,
      photo: c.photoUrl,
      passages: 0,
    };
    seen.passages++;
    counts.set(c.slug, seen);
  }
  return [...counts.values()].sort(
    (a, b) => b.passages - a.passages || a.name.localeCompare(b.name, 'fr'),
  );
}

/**
 * Les enjeux, rangés par le nombre de programmes publiés qui en parlent,
 * puis par le nombre de passages. Le compte est une recherche des termes
 * publiés de chaque enjeu dans le texte des programmes : il dit de quoi les
 * programmes parlent, pas ce qu'ils valent.
 */
@Controller('public/enjeux')
export class ListTopicsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const documents = await this.prisma.politicalDocument.findMany({
      where: { kind: DocumentKind.programme, sourceRef: { not: null } },
      select: {
        id: true,
        sourceRef: true,
        fetchedAt: true,
        createdAt: true,
        candidate: { select: { slug: true, programmeStatus: true } },
      },
    });
    const current = currentCaptures(
      documents.map((d) => ({
        id: d.id,
        sourceRef: d.sourceRef!,
        fetchedAt: d.fetchedAt ?? d.createdAt,
      })),
    );
    const candidates = new Map(
      documents
        .filter((d) => current.has(d.id) && d.candidate)
        .map((d) => [d.candidate!.slug, d.candidate!.programmeStatus]),
    );
    const topics = await this.prisma.topic.findMany({
      include: {
        matches: {
          where: { measure: { documentId: { in: [...current] } } },
          select: {
            measure: {
              select: {
                document: {
                  select: {
                    candidate: {
                      select: { slug: true, name: true, photoUrl: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const publications = new Set(
      (
        await this.prisma.publication.findMany({
          where: { slug: { in: topics.map((t) => t.slug) } },
          select: { slug: true },
        })
      ).map((p) => p.slug),
    );
    const statuses = [...candidates.values()];
    return {
      programmes: {
        candidates: candidates.size,
        complete: statuses.filter((s) => s === 'complete').length,
        partial: statuses.filter((s) => s === 'partial').length,
      },
      topics: topics
        .map((t) => ({
          slug: t.slug,
          name: t.name,
          pillar: t.pillar,
          terms: t.terms,
          programmes: new Set(
            t.matches.map((m) => m.measure.document.candidate?.slug),
          ).size,
          candidates: perCandidate(t.matches),
          passages: t.matches.length,
          publication: publications.has(t.slug) ? t.slug : null,
        }))
        .sort(
          (a, b) =>
            b.programmes - a.programmes ||
            b.passages - a.passages ||
            a.name.localeCompare(b.name, 'fr'),
        ),
    };
  }
}
