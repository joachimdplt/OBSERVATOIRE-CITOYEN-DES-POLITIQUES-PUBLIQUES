import { liveProgrammes } from '../../../common/live-programmes';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { inLabel } from '../../../domain/filing-unit';
import { withoutTestimonies } from '../../../domain/programme';
import { LabelStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Ce que dit un candidat, sujet par sujet : ses passages rangés dans chaque
 * sujet de la grille CAP, cités mot pour mot avec leur document et leur
 * page. Les sujets suivent l'ordre de la grille : aucun compte ne classe
 * un sujet avant un autre. Un rangement « à trancher » ou retiré ne
 * s'affiche pas.
 */
@Controller('public/elections')
export class GetCandidateSubjectsController {
  constructor(private prisma: PrismaService) {}

  @Get(':slug/candidates/:candidate/subjects')
  async get(@Param('slug') slug: string, @Param('candidate') key: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { slug: key, election: { slug } },
      select: { id: true },
    });
    if (!candidate) throw new NotFoundException('Candidat inconnu');

    const labels = await this.prisma.capLabel.findMany({
      where: {
        candidateId: candidate.id,
        status: { in: [LabelStatus.proposed, LabelStatus.validated] },
      },
      select: {
        documentUrl: true,
        heading: true,
        fromPosition: true,
        positions: true,
        capCode: true,
        status: true,
      },
    });
    const documents = await liveProgrammes(this.prisma, {
      where: { url: { in: [...new Set(labels.map((l) => l.documentUrl))] } },
      select: {
        id: true,
        url: true,
        title: true,
      },
    });
    const live = new Map(documents.map((d) => [d.url, d]));
    const measures = withoutTestimonies(
      await this.prisma.measure.findMany({
        where: { documentId: { in: [...live.values()].map((d) => d.id) } },
        select: {
          documentId: true,
          article: true,
          quote: true,
          page: true,
          position: true,
        },
        orderBy: { position: 'asc' },
      }),
      (m) => m.quote,
    );
    const topics = await this.prisma.capTopic.findMany({
      where: { level: 1 },
      select: { code: true, labelFr: true },
    });

    const bySubject = new Map<
      string,
      {
        quote: string;
        page: number | null;
        heading: string;
        document: { title: string; url: string };
        checked: boolean;
        position: number;
      }[]
    >();
    for (const l of labels) {
      const d = live.get(l.documentUrl);
      if (!d) continue;
      const list = bySubject.get(l.capCode) ?? [];
      for (const m of measures)
        if (
          m.documentId === d.id &&
          m.article === l.heading &&
          inLabel(l, m.position) &&
          !list.some((x) => x.quote === m.quote)
        )
          list.push({
            quote: m.quote,
            page: m.page,
            heading: l.heading,
            document: { title: d.title, url: d.url ?? '' },
            checked: l.status === LabelStatus.validated,
            position: m.position ?? 0,
          });
      bySubject.set(l.capCode, list);
    }
    return topics
      .filter((t) => (bySubject.get(t.code) ?? []).length > 0)
      .sort((a, b) => Number(a.code) - Number(b.code))
      .map((t) => {
        const passages = bySubject
          .get(t.code)!
          .sort(
            (a, b) =>
              a.document.url.localeCompare(b.document.url) ||
              a.position - b.position,
          );
        return {
          code: t.code,
          label: t.labelFr,
          total: passages.length,
          passages: passages.map((p) => ({
            quote: p.quote,
            page: p.page,
            heading: p.heading,
            document: p.document,
            checked: p.checked,
          })),
        };
      });
  }
}
