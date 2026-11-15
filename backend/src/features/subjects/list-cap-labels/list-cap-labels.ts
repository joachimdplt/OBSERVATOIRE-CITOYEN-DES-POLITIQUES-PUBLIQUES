import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { LabelStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/** Les chapitres montrés à la fois. */
const PAGE = 20;

/**
 * Les rangements automatiques en vigueur, chapitre par chapitre : pour
 * chaque chapitre d'un candidat (son document et son titre), ses sous-sujets
 * et leur score, pour retirer ceux qui sont faux.
 */
@Controller('admin/subjects/labels')
@UseGuards(SessionGuard)
@Requires('edit')
export class ListCapLabelsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('candidate') candidate?: string) {
    const labels = await this.prisma.capLabel.findMany({
      where: {
        status: { not: LabelStatus.rejected },
        ...(candidate ? { candidate: { slug: candidate } } : {}),
      },
      include: {
        candidate: { select: { slug: true, name: true } },
        topic: { include: { major: true } },
      },
      orderBy: [
        { candidateId: 'asc' },
        { documentUrl: 'asc' },
        { heading: 'asc' },
      ],
    });
    const chapters = new Map<
      string,
      {
        candidate: { slug: string; name: string };
        documentUrl: string;
        heading: string;
        labels: {
          id: string;
          code: string;
          label: string;
          major: string;
          origin: string;
          score: number | null;
        }[];
      }
    >();
    for (const l of labels) {
      const key = `${l.candidateId}\n${l.documentUrl}\n${l.heading}`;
      const c = chapters.get(key) ?? {
        candidate: l.candidate,
        documentUrl: l.documentUrl,
        heading: l.heading,
        labels: [],
      };
      c.labels.push({
        id: l.id,
        code: l.capCode,
        label: l.topic.labelFr,
        major: l.topic.major?.labelFr ?? '',
        origin: l.origin,
        score: l.score,
      });
      chapters.set(key, c);
    }
    const all = [...chapters.values()];
    for (const c of all)
      c.labels.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return { total: all.length, chapters: all.slice(0, PAGE) };
  }
}
