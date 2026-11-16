import { liveProgrammes } from '../../../common/live-programmes';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { indicatorTopic, themeTopic } from '../../../domain/approach-topics';
import type {
  DiagnosisChapter,
  DiagnosisIndicator,
} from '../../../domain/campaign';
import { withoutTestimonies } from '../../../domain/programme';
import {
  CampaignSourceKind,
  DocumentKind,
  LabelStatus,
} from '../../../generated/prisma/enums';
import {
  subjectChapters,
  type SubjectChapter,
} from '../../../domain/subject-chapters';
import { PrismaService } from '../../../prisma/prisma.service';
import { inLabel } from '../../../domain/filing-unit';

/** Les premiers passages cités sous chaque chapitre. */
const EXCERPT = 2;

/**
 * Un sujet de la grille CAP et, pour chaque candidat, ses chapitres rangés
 * dans ce sujet : leur titre exact, leur document et leurs premiers passages
 * cités mot pour mot. Le rangement est automatique ; un rangement retiré ne
 * s'affiche pas. Aucun compte, aucune part : un candidat sans chapitre rangé
 * ici est nommé à part, sans conclusion sur sa position.
 */
@Controller('public/subjects')
export class GetSubjectController {
  constructor(private prisma: PrismaService) {}

  @Get(':code')
  async get(@Param('code') code: string) {
    const topic = await this.prisma.capTopic.findUnique({ where: { code } });
    if (!topic || topic.level !== 1)
      throw new NotFoundException('Sujet inconnu');

    const labels = await this.prisma.capLabel.findMany({
      where: {
        capCode: code,
        status: { in: [LabelStatus.proposed, LabelStatus.validated] },
      },
      select: {
        candidateId: true,
        documentUrl: true,
        heading: true,
        fromPosition: true,
        positions: true,
        model: true,
      },
    });
    const documents = await liveProgrammes(this.prisma, {
      where: { url: { in: [...new Set(labels.map((l) => l.documentUrl))] } },
      select: {
        id: true,
        fetchedAt: true,
        url: true,
        title: true,
      },
    });
    const live = new Map(documents.map((d) => [d.url, d]));
    const candidates = await this.prisma.candidate.findMany({
      where: { election: { slug: 'presidentielle-2027' } },
      select: {
        id: true,
        slug: true,
        name: true,
        party: true,
        photoUrl: true,
        programmeStatus: true,
        programmeNote: true,
      },
      orderBy: { name: 'asc' },
    });

    const byCandidate = new Map<string, SubjectChapter[]>();
    // Tous les passages des chapitres rangés, en une seule requête.
    const wanted = labels.filter((l) => live.has(l.documentUrl));
    const measures = await this.prisma.measure.findMany({
      where: {
        documentId: {
          in: [...new Set(wanted.map((l) => live.get(l.documentUrl)!.id))],
        },
        article: { in: [...new Set(wanted.map((l) => l.heading))] },
      },
      select: {
        documentId: true,
        article: true,
        quote: true,
        page: true,
        position: true,
      },
      orderBy: { position: 'asc' },
    });
    const passagesOf = new Map<string, typeof measures>();
    for (const m of withoutTestimonies(measures, (m) => m.quote)) {
      const key = `${m.documentId}\n${m.article}`;
      const list = passagesOf.get(key) ?? [];
      list.push(m);
      passagesOf.set(key, list);
    }
    for (const l of wanted) {
      const d = live.get(l.documentUrl)!;
      // Les premiers passages du chapitre, ou, pour un long chapitre rangé
      // bloc par bloc, ceux du bloc qui parle de ce sujet.
      const passages = (passagesOf.get(`${d.id}\n${l.heading}`) ?? [])
        .filter((p) => inLabel(l, p.position))
        .slice(0, EXCERPT);
      if (passages.length === 0) continue;
      const list = byCandidate.get(l.candidateId) ?? [];
      list.push({
        heading: l.heading,
        document: { title: d.title, url: d.url ?? '' },
        excerpt: passages.map((p) => ({ quote: p.quote, page: p.page })),
        position: passages[0].position ?? 0,
      });
      byCandidate.set(l.candidateId, list);
    }

    // Les candidats qui ont au moins un programme collecté et lu.
    const collected = new Set(
      (
        await this.prisma.politicalDocument.findMany({
          where: {
            kind: DocumentKind.programme,
            retiredAt: null,
            measures: { some: {} },
          },
          select: { candidateId: true },
          distinct: ['candidateId'],
        })
      ).map((d) => d.candidateId),
    );

    // Une démarche qui n'est pas un programme (un état des lieux, une
    // consultation) : ses indicateurs et ses thèmes rattachés à ce sujet par
    // une table fixe. Les solutions d'une consultation sont celles des
    // participants : seuls les nombres publiés par le candidat sont repris.
    const sources = await this.prisma.campaignSource.findMany({
      where: {
        kind: {
          in: [CampaignSourceKind.method, CampaignSourceKind.consultation],
        },
      },
      include: { snapshots: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
    });
    const approachOf = new Map<
      string,
      {
        constats: {
          label: string;
          title: string;
          url: string;
          indicators: DiagnosisIndicator[];
        }[];
        consultation: { theme: string; text: string; url: string }[];
        fetchedAt: string;
      }
    >();
    for (const source of sources) {
      const snapshot = source.snapshots.at(0);
      if (!snapshot) continue;
      const a = approachOf.get(source.candidateId) ?? {
        constats: [],
        consultation: [],
        fetchedAt: snapshot.fetchedAt.toISOString(),
      };
      if (source.kind === CampaignSourceKind.method)
        for (const chapter of snapshot.passages as DiagnosisChapter[]) {
          const indicators = chapter.indicators.filter(
            (i) => indicatorTopic(i.name) === code,
          );
          if (indicators.length)
            a.constats.push({
              label: chapter.label,
              title: chapter.title,
              url: chapter.anchor
                ? `${source.url}#${chapter.anchor}`
                : source.url,
              indicators,
            });
        }
      else
        for (const figure of snapshot.figures as {
          label: string;
          text: string;
        }[])
          if (themeTopic(figure.label) === code)
            a.consultation.push({
              theme: figure.label,
              text: figure.text,
              url: source.url,
            });
      if (a.constats.length || a.consultation.length)
        approachOf.set(source.candidateId, a);
    }
    const present = (id: string) => byCandidate.has(id) || approachOf.has(id);

    const model = labels.find((l) => l.model)?.model ?? null;
    return {
      topic: { code: topic.code, label: topic.labelFr, title: topic.title },
      classification: {
        grid: 'Comparative Agendas Project',
        automatic: true,
        model,
      },
      candidates: candidates
        .filter((c) => present(c.id))
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          party: c.party,
          photo: c.photoUrl,
          // Ce que sont ses documents (programme complet, contre-budget…),
          // pour qu'une citation ne passe pas pour plus qu'elle n'est.
          programmeStatus: c.programmeStatus,
          programmeNote: c.programmeNote,
          chapters: subjectChapters(byCandidate.get(c.id) ?? []),
          approach: approachOf.get(c.id) ?? null,
        })),
      // Ceux qui n'ont rien ici : sans aucun programme collecté, ou avec
      // un programme collecté mais aucun chapitre rangé dans ce sujet.
      without: candidates
        .filter((c) => !present(c.id))
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          collected: collected.has(c.id),
        })),
    };
  }
}
