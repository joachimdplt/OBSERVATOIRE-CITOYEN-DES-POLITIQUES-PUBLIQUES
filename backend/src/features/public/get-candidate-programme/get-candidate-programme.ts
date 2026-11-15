import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { currentCaptures } from '../../../domain/programme';
import { isProposal } from '../../../domain/programme-profile';
import { readingChapters } from '../../../domain/programme-reading';
import type {
  DiagnosisChapter,
  ParticipationCount,
} from '../../../domain/campaign';
import {
  CampaignSourceKind,
  DocumentKind,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/** Un intitulé qui tient lieu d'étape : au moins deux mots, ou un mot de sujet. */
const meaningful = (h: string) =>
  h
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}{2,}/u.test(w)).length >= 2 ||
  // Un mot seul vaut titre (« Immigration », « Fraude »), sauf les mots de
  // mise en page.
  (/^\p{Lu}[\p{L}-]{4,}$/u.test(h.trim()) &&
    !/^(sommaire|introduction|pr[ée]ambule|[ée]dito(rial)?|conclusion|annexes?|accueil|menu|contact|recherche)$/i.test(
      h.trim(),
    ));

/**
 * Le programme d'un candidat, lu en entier et sans rien reformuler : sa
 * structure (ses documents et leurs rubriques, dans l'ordre), son plan de
 * lecture chapitre par chapitre, et ses passages cités mot pour mot.
 */
@Controller('public/elections')
export class GetCandidateProgrammeController {
  constructor(private prisma: PrismaService) {}

  @Get(':slug/candidates/:candidate/programme')
  async get(
    @Param('slug') slug: string,
    @Param('candidate') candidateSlug: string,
  ) {
    const candidate = await this.candidate(slug, candidateSlug);

    // Sa démarche, quand elle n'est pas un programme : un diagnostic chiffré
    // ou une consultation, chacun par son dernier relevé daté.
    const campaign = await this.prisma.campaignSource.findMany({
      where: {
        candidateId: candidate.id,
        kind: {
          in: [CampaignSourceKind.method, CampaignSourceKind.consultation],
        },
      },
      include: { snapshots: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });
    const approach = campaign
      .filter((c) => c.snapshots.length > 0)
      .map((c) => ({
        kind: c.kind,
        url: c.url,
        title: c.snapshots[0].title,
        fetchedAt: c.snapshots[0].fetchedAt.toISOString(),
        chapters: c.snapshots[0].passages as DiagnosisChapter[],
        counts: c.snapshots[0].figures as ParticipationCount[],
      }));

    const { own, mine, passages, served } = await this.reading(candidate.id);

    // La structure : chaque document, puis ses rubriques dans l'ordre.
    // Un document qui ne donne aucun passage (une page d'entrée faite de
    // liens) ne figure pas dans la structure.
    const outline = own
      .filter((d) => mine.some((m) => m.documentId === d.id))
      .map((d) => {
        const inDoc = mine.filter((m) => m.documentId === d.id);
        const headings: { heading: string; passages: number }[] = [];
        for (const m of inDoc) {
          if (!meaningful(m.article) || m.article === d.title) continue;
          const last = headings.at(-1);
          if (last && last.heading === m.article) last.passages++;
          else headings.push({ heading: m.article, passages: 1 });
        }
        return {
          title: d.title,
          url: d.url,
          fetchedAt: d.fetchedAt?.toISOString().slice(0, 10) ?? null,
          passages: inDoc.length,
          headings,
        };
      });

    const topics = await this.prisma.topicMatch.groupBy({
      by: ['topicId'],
      where: { measureId: { in: mine.map((m) => m.id) } },
      _count: { measureId: true },
      orderBy: { _count: { measureId: 'desc' } },
    });
    const topicTotal = topics.reduce((n, t) => n + t._count.measureId, 0);
    const names = new Map(
      (
        await this.prisma.topic.findMany({
          where: { id: { in: topics.map((t) => t.topicId) } },
          select: { id: true, slug: true, name: true },
        })
      ).map((t) => [t.id, t]),
    );
    // Le plan de lecture : tous les chapitres, et le texte du premier
    // seulement. Le site charge chaque chapitre quand on s'en approche.
    const read = readingChapters(passages);
    const first = read.at(0);
    // Chaque chapitre renvoie à son document par son rang dans la structure,
    // sans en répéter le titre ni l'adresse ; ses rubriques ne sont données
    // que si elles diffèrent de son nom.
    const rankOf = new Map(outline.map((d, i) => [d.url, i]));
    const chapters = read.map((c) => ({
      label: c.label,
      document: rankOf.get(c.url) ?? 0,
      start: c.start,
      count: c.count,
      from: c.from,
      to: c.to,
      headings:
        c.headings.length === 1 && c.headings[0] === c.label ? [] : c.headings,
    }));

    return {
      summary: {
        documents: own.length,
        passages: mine.length,
        proposals: mine.filter((m) => isProposal(m.quote)).length,
        covered: mine.filter((m) => m._count.topics > 0).length,
        // Tous ses sujets, avec leur part dans son programme (elles font 1).
        topTopics: topics.map((t) => ({
          slug: names.get(t.topicId)?.slug ?? '',
          name: names.get(t.topicId)?.name ?? '',
          passages: t._count.measureId,
          share: topicTotal ? t._count.measureId / topicTotal : 0,
        })),
      },
      approach,
      outline,
      chapters,
      // Le premier écran seulement : les premiers passages du premier
      // chapitre ; la suite se charge à l'approche.
      passages: first
        ? served.slice(first.start, first.start + Math.min(first.count, 12))
        : [],
    };
  }

  /** Les passages d'un chapitre de lecture, chargés quand on s'en approche. */
  @Get(':slug/candidates/:candidate/programme/passages')
  async passages(
    @Param('slug') slug: string,
    @Param('candidate') candidateSlug: string,
    @Query('start') start = '0',
    @Query('count') count = '50',
  ) {
    const from = Number(start);
    const size = Number(count);
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(size) ||
      from < 0 ||
      size < 1 ||
      size > 1000
    )
      throw new BadRequestException('Début ou nombre de passages invalide');
    const candidate = await this.candidate(slug, candidateSlug);
    const { served } = await this.reading(candidate.id);
    return { start: from, passages: served.slice(from, from + size) };
  }

  private async candidate(slug: string, candidateSlug: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { slug: candidateSlug, election: { slug } },
    });
    if (!candidate) throw new NotFoundException('Candidat inconnu');
    return candidate;
  }

  /** Ses documents en vigueur et ses passages, dans l'ordre du programme. */
  private async reading(candidateId: string) {
    const all = await this.prisma.politicalDocument.findMany({
      where: {
        kind: DocumentKind.programme,
        sourceRef: { not: null },
        retiredAt: null,
      },
      select: {
        id: true,
        sourceRef: true,
        fetchedAt: true,
        createdAt: true,
        candidateId: true,
        title: true,
        url: true,
        programmeSource: { select: { id: true, url: true } },
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
    // Ses documents, source par source dans l'ordre où elles ont été lues ;
    // dans une source, sa page d'entrée (la table du programme) d'abord.
    const sourceRank = new Map<string, number>();
    for (const d of live)
      if (d.programmeSource && !sourceRank.has(d.programmeSource.id))
        sourceRank.set(d.programmeSource.id, sourceRank.size);
    const own = live
      .filter((d) => d.candidateId === candidateId)
      .map((d, i) => ({ d, i }))
      .sort(
        (x, y) =>
          (sourceRank.get(x.d.programmeSource?.id ?? '') ?? 0) -
            (sourceRank.get(y.d.programmeSource?.id ?? '') ?? 0) ||
          Number(x.d.url !== x.d.programmeSource?.url) -
            Number(y.d.url !== y.d.programmeSource?.url) ||
          x.i - y.i,
      )
      .map((e) => e.d);

    const measures = await this.prisma.measure.findMany({
      where: { documentId: { in: own.map((d) => d.id) } },
      select: {
        id: true,
        documentId: true,
        article: true,
        quote: true,
        position: true,
        page: true,
        _count: { select: { topics: true } },
      },
      orderBy: { position: 'asc' },
    });
    const ownIds = new Set(own.map((d) => d.id));
    // Dans l'ordre du programme : ses documents tels que collectés, puis le
    // rang de chaque passage dans son document.
    const docRank = new Map(own.map((d, i) => [d.id, i]));
    const mine = measures
      .filter((m) => ownIds.has(m.documentId))
      .sort(
        (a, b) =>
          (docRank.get(a.documentId) ?? 0) - (docRank.get(b.documentId) ?? 0) ||
          (a.position ?? 0) - (b.position ?? 0),
      );

    const docOf = new Map(own.map((d) => [d.id, d]));
    // Tout le programme, dans l'ordre, chaque passage avec sa page.
    const passages = mine.map((m) => ({
      heading: m.article,
      quote: m.quote,
      page: m.page,
      document: {
        title: docOf.get(m.documentId)?.title ?? '',
        url: docOf.get(m.documentId)?.url ?? '',
      },
    }));
    // Tels que l'API les donne : le document par son rang dans la structure
    // (les seuls documents qui ont des passages), sans titre ni adresse.
    const withPassages = own.filter((d) =>
      mine.some((m) => m.documentId === d.id),
    );
    const rank = new Map(withPassages.map((d, i) => [d.url, i]));
    const served = passages.map((p) => ({
      heading: p.heading,
      quote: p.quote,
      page: p.page,
      document: rank.get(p.document.url) ?? 0,
    }));
    return { own, mine, passages, served };
  }
}
