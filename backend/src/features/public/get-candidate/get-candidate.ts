import { liveProgrammes } from '../../../common/live-programmes';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
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

    const documents = await liveProgrammes(this.prisma, {
      where: { candidateId: c.id },
      select: { id: true, sourceRef: true, fetchedAt: true },
    });
    const current = documents.map((d) => d.id);
    const [passages, videos] = await Promise.all([
      this.prisma.measure.count({ where: { documentId: { in: current } } }),
      this.prisma.videoCandidate.findMany({
        where: { candidateId: c.id },
        include: { video: { include: { channel: true } } },
        orderBy: { video: { publishedAt: 'desc' } },
        take: VIDEOS,
      }),
    ]);
    return {
      election: { slug: c.election.slug, name: c.election.name },
      slug: c.slug,
      name: c.name,
      party: c.party,
      declaredAt: c.declaredAt.toISOString().slice(0, 10),
      declarationSource: c.declarationSource,
      programmeStatus: c.programmeStatus,
      programmeUrl: c.programmeUrl,
      // Son site de campagne officiel.
      website: c.website,
      partyWebsite: c.partyWebsite,
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
