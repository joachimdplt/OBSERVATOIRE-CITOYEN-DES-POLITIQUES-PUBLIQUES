import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { currentCaptures } from '../../../domain/programme';
import {
  distinctiveVocabulary,
  isFigured,
  isProposal,
} from '../../../domain/programme-profile';
import { DocumentKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/** Les passages chiffrés montrés, dans l'ordre du programme. */
const FIGURED = 12;

/** Un intitulé qui tient lieu d'étape : au moins deux mots. */
const meaningful = (h: string) =>
  h
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}{2,}/u.test(w)).length >= 2;

/**
 * Le programme d'un candidat, lu en entier et sans rien reformuler : sa
 * structure (ses documents et leurs rubriques, dans l'ordre, avec le nombre
 * de passages), son vocabulaire propre comparé aux autres programmes, ses
 * propositions (passages qui commencent par un verbe d'action) et ses
 * passages chiffrés, cités mot pour mot. Le résumé n'est fait que de comptes.
 */
@Controller('public/elections')
export class GetCandidateProgrammeController {
  constructor(private prisma: PrismaService) {}

  @Get(':slug/candidates/:candidate/programme')
  async get(
    @Param('slug') slug: string,
    @Param('candidate') candidateSlug: string,
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { slug: candidateSlug, election: { slug } },
    });
    if (!candidate) throw new NotFoundException('Candidat inconnu');

    const all = await this.prisma.politicalDocument.findMany({
      where: { kind: DocumentKind.programme, sourceRef: { not: null } },
      select: {
        id: true,
        sourceRef: true,
        fetchedAt: true,
        createdAt: true,
        candidateId: true,
        title: true,
        url: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    const current = currentCaptures(
      all.map((d) => ({
        id: d.id,
        sourceRef: d.sourceRef!,
        fetchedAt: d.fetchedAt ?? d.createdAt,
      })),
    );
    const live = all.filter((d) => current.has(d.id));
    const own = live.filter((d) => d.candidateId === candidate.id);

    const measures = await this.prisma.measure.findMany({
      where: { documentId: { in: live.map((d) => d.id) } },
      select: {
        id: true,
        documentId: true,
        article: true,
        quote: true,
        position: true,
        _count: { select: { topics: true } },
      },
      orderBy: { position: 'asc' },
    });
    const ownIds = new Set(own.map((d) => d.id));
    const mine = measures.filter((m) => ownIds.has(m.documentId));
    const others = measures.filter((m) => !ownIds.has(m.documentId));

    // La structure : chaque document, puis ses rubriques dans l'ordre.
    const outline = own.map((d) => {
      const passages = mine.filter((m) => m.documentId === d.id);
      const headings: { heading: string; passages: number }[] = [];
      for (const m of passages) {
        if (!meaningful(m.article) || m.article === d.title) continue;
        const last = headings.at(-1);
        if (last && last.heading === m.article) last.passages++;
        else headings.push({ heading: m.article, passages: 1 });
      }
      return {
        title: d.title,
        url: d.url,
        fetchedAt: d.fetchedAt?.toISOString().slice(0, 10) ?? null,
        passages: passages.length,
        headings,
      };
    });

    const topics = await this.prisma.topicMatch.groupBy({
      by: ['topicId'],
      where: { measureId: { in: mine.map((m) => m.id) } },
      _count: { measureId: true },
      orderBy: { _count: { measureId: 'desc' } },
      take: 5,
    });
    const names = new Map(
      (
        await this.prisma.topic.findMany({
          where: { id: { in: topics.map((t) => t.topicId) } },
          select: { id: true, slug: true, name: true },
        })
      ).map((t) => [t.id, t]),
    );
    const docOf = new Map(own.map((d) => [d.id, d]));
    const proposals = mine.filter((m) => isProposal(m.quote));

    return {
      summary: {
        documents: own.length,
        passages: mine.length,
        proposals: proposals.length,
        figured: mine.filter((m) => isFigured(m.quote)).length,
        covered: mine.filter((m) => m._count.topics > 0).length,
        topTopics: topics.map((t) => ({
          slug: names.get(t.topicId)?.slug ?? '',
          name: names.get(t.topicId)?.name ?? '',
          passages: t._count.measureId,
        })),
      },
      outline,
      vocabulary: distinctiveVocabulary(
        mine.map((m) => m.quote),
        others.map((m) => m.quote),
        { exclude: [candidate.name] },
      ),
      figured: proposals
        .filter((m) => isFigured(m.quote))
        .slice(0, FIGURED)
        .map((m) => ({
          heading: m.article,
          quote: m.quote,
          document: {
            title: docOf.get(m.documentId)?.title ?? '',
            url: docOf.get(m.documentId)?.url ?? '',
          },
        })),
    };
  }
}
