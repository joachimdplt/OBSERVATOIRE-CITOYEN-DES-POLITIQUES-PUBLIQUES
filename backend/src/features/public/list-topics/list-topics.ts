import { liveProgrammes } from '../../../common/live-programmes';
import { Controller, Get } from '@nestjs/common';
import { globalShares, sharesByCandidate } from '../../../domain/topic-share';
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
 * Les sujets, rangés par leur place moyenne dans les programmes : pour chaque
 * candidat, la part du sujet dans son programme ; puis la moyenne de ces
 * parts, chaque candidat comptant pour la même fraction. Le compte est une recherche des termes
 * publiés de chaque enjeu dans le texte des programmes : il dit de quoi les
 * programmes parlent, pas ce qu'ils valent.
 */
@Controller('public/enjeux')
export class ListTopicsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const documents = await liveProgrammes(this.prisma, {
      select: {
        id: true,
        candidate: { select: { slug: true, programmeStatus: true } },
      },
    });
    const current = documents.map((d) => d.id);
    const candidates = new Map(
      documents
        .filter((d) => d.candidate)
        .map((d) => [d.candidate!.slug, d.candidate!.programmeStatus]),
    );
    const topics = await this.prisma.topic.findMany({
      include: {
        matches: {
          where: { measure: { documentId: { in: current } } },
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
    // Un candidat, une voix : parts par candidat, puis moyenne.
    const listed = topics.map((t) => ({ t, people: perCandidate(t.matches) }));
    const counts = new Map<string, Map<string, number>>();
    for (const { t, people } of listed)
      for (const p of people) {
        const own = counts.get(p.slug) ?? new Map<string, number>();
        own.set(t.slug, p.passages);
        counts.set(p.slug, own);
      }
    const shares = sharesByCandidate(counts);
    const global = globalShares(shares, candidates.size);
    return {
      programmes: {
        candidates: candidates.size,
        complete: statuses.filter((s) => s === 'complete').length,
        partial: statuses.filter((s) => s === 'partial').length,
      },
      topics: listed
        .map(({ t, people }) => ({
          slug: t.slug,
          name: t.name,
          pillar: t.pillar,
          terms: t.terms,
          programmes: new Set(
            t.matches.map((m) => m.measure.document.candidate?.slug),
          ).size,
          /** La place du sujet : la moyenne des parts, un candidat une voix. */
          share: global.get(t.slug) ?? 0,
          candidates: people
            .map((p) => ({
              ...p,
              share: shares.get(p.slug)?.get(t.slug) ?? 0,
            }))
            .sort((a, b) => b.share - a.share),
          passages: t.matches.length,
          publication: publications.has(t.slug) ? t.slug : null,
        }))
        .sort(
          (a, b) => b.share - a.share || a.name.localeCompare(b.name, 'fr'),
        ),
    };
  }
}
