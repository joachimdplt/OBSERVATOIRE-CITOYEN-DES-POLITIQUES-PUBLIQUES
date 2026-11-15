import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { currentCaptures } from '../../../domain/programme';
import { DocumentKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/** Les vidéos les plus récentes d'une page de candidat. */
const VIDEOS = 30;

/**
 * La page d'un candidat : sa déclaration et sa source, l'état de son
 * programme, les enjeux dont parle son programme (par nombre de passages),
 * ses chaînes vidéo (la sienne, celle de son parti) si un site officiel les donne, et ses vidéos publiques récentes
 * venues des sources primaires, chacune avec la raison de son rattachement.
 */
@Controller('public/elections')
export class GetCandidateController {
  constructor(private prisma: PrismaService) {}

  @Get(':slug/candidates/:candidate')
  async get(
    @Param('slug') slug: string,
    @Param('candidate') candidateSlug: string,
  ) {
    const c = await this.prisma.candidate.findFirst({
      where: { slug: candidateSlug, election: { slug } },
      include: {
        election: true,
        videoChannels: true,
        accounts: { orderBy: { network: 'asc' } },
      },
    });
    if (!c) throw new NotFoundException('Candidat inconnu');

    const documents = await this.prisma.politicalDocument.findMany({
      where: {
        kind: DocumentKind.programme,
        candidateId: c.id,
        sourceRef: { not: null },
      },
      select: { id: true, sourceRef: true, fetchedAt: true, createdAt: true },
    });
    const current = [
      ...currentCaptures(
        documents.map((d) => ({
          id: d.id,
          sourceRef: d.sourceRef!,
          fetchedAt: d.fetchedAt ?? d.createdAt,
        })),
      ),
    ];
    const [passages, matches, videos] = await Promise.all([
      this.prisma.measure.count({ where: { documentId: { in: current } } }),
      this.prisma.topicMatch.findMany({
        where: { measure: { documentId: { in: current } } },
        select: { topic: { select: { slug: true, name: true, pillar: true } } },
      }),
      this.prisma.videoCandidate.findMany({
        where: { candidateId: c.id },
        include: { video: { include: { channel: true } } },
        orderBy: { video: { publishedAt: 'desc' } },
        take: VIDEOS,
      }),
    ]);
    const topics = new Map<
      string,
      { slug: string; name: string; pillar: string; passages: number }
    >();
    for (const { topic } of matches) {
      const t = topics.get(topic.slug) ?? { ...topic, passages: 0 };
      t.passages++;
      topics.set(topic.slug, t);
    }

    return {
      election: { slug: c.election.slug, name: c.election.name },
      slug: c.slug,
      name: c.name,
      party: c.party,
      declaredAt: c.declaredAt.toISOString().slice(0, 10),
      declarationSource: c.declarationSource,
      programmeStatus: c.programmeStatus,
      programmeUrl: c.programmeUrl,
      programmeNote: c.programmeNote,
      programmeCheckedAt:
        c.programmeCheckedAt?.toISOString().slice(0, 10) ?? null,
      photo: c.photoUrl
        ? {
            url: c.photoUrl,
            author: c.photoAuthor,
            licence: c.photoLicence,
            licenceUrl: c.photoLicenceUrl,
            page: c.photoPage,
          }
        : null,
      programme: { documents: current.length, passages },
      topics: [...topics.values()].sort(
        (a, b) => b.passages - a.passages || a.name.localeCompare(b.name, 'fr'),
      ),
      accounts: c.accounts.map((a) => ({
        network: a.network,
        handle: a.handle,
        url: a.url,
        source: a.source,
      })),
      channels: c.videoChannels.map((ch) => ({
        kind: ch.kind,
        name: ch.name,
        url: `https://www.youtube.com/channel/${ch.youtubeId}`,
        linkedFrom: ch.linkedFrom,
      })),
      videos: videos.map(({ video: v, link }) => ({
        title: v.title,
        url: v.url,
        thumbnail: v.thumbnail,
        publishedAt: v.publishedAt.toISOString().slice(0, 10),
        channel: { name: v.channel.name, kind: v.channel.kind },
        link,
      })),
    };
  }
}
