import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { accountUrl } from '../../../domain/accounts';
import { ChannelKind } from '../../../generated/prisma/enums';
import {
  ACCOUNT_SOURCE,
  SITE_ACCOUNT_SOURCE,
  type AccountSource,
  type FoundAccount,
  type SiteAccountSource,
} from '../../../ports/account-source';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Les comptes publics des candidats, relevés sur leur élément Wikidata et
 * sur leur site de campagne officiel : les mêmes sources pour tous. Un compte retiré de Wikidata est retiré ici. Une
 * chaîne YouTube trouvée rejoint les chaînes suivies pour les vidéos, comme
 * chaîne du candidat, avec Wikidata pour source.
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class CollectCandidateAccountsController {
  constructor(
    private prisma: PrismaService,
    @Inject(ACCOUNT_SOURCE) private accounts: AccountSource,
    @Inject(SITE_ACCOUNT_SOURCE) private sites: SiteAccountSource,
  ) {}

  @Post('candidate-accounts')
  @HttpCode(200)
  collect() {
    return collectCandidateAccounts(this.prisma, this.accounts, this.sites);
  }
}

/** Le geste du collecteur, appelé par l'administration ou la collecte quotidienne. */
export async function collectCandidateAccounts(
  prisma: PrismaService,
  source: AccountSource,
  sites?: SiteAccountSource,
) {
  const candidates = await prisma.candidate.findMany({
    where: { OR: [{ wikidataId: { not: null } }, { website: { not: null } }] },
  });
  const report = {
    candidates: 0,
    accounts: 0,
    channels: 0,
    failed: [] as string[],
  };
  for (const c of candidates) {
    // Chaque source relevée avec son adresse : Wikidata, puis le site de campagne.
    const origins: { origin: string; read: () => Promise<FoundAccount[]> }[] =
      [];
    if (c.wikidataId)
      origins.push({
        origin: `https://www.wikidata.org/wiki/${c.wikidataId}`,
        read: () => source.accountsOf(c.wikidataId!),
      });
    if (c.website && sites)
      origins.push({
        origin: c.website,
        read: () => sites.accountsOnSite(c.website!),
      });
    report.candidates++;
    for (const { origin, read } of origins) {
      let found: FoundAccount[];
      try {
        found = await read();
      } catch (e) {
        report.failed.push(`${c.name} (${origin}) : ${String(e)}`);
        continue;
      }
      const keep = new Set(found.map((a) => `${a.network}:${a.handle}`));
      const existing = await prisma.candidateAccount.findMany({
        where: { candidateId: c.id, source: origin },
      });
      for (const a of existing)
        if (!keep.has(`${a.network}:${a.handle}`))
          await prisma.candidateAccount.delete({ where: { id: a.id } });
      for (const a of found) {
        const same = await prisma.candidateAccount.findUnique({
          where: {
            candidateId_network_handle: {
              candidateId: c.id,
              network: a.network,
              handle: a.handle,
            },
          },
        });
        // Un compte déjà relevé ailleurs garde sa première source.
        if (same) {
          await prisma.candidateAccount.update({
            where: { id: same.id },
            data: { checkedAt: new Date() },
          });
        } else {
          await prisma.candidateAccount.create({
            data: {
              candidateId: c.id,
              network: a.network,
              handle: a.handle,
              url: accountUrl(a.network, a.handle),
              source: origin,
            },
          });
        }
        report.accounts++;
        if (a.network === 'youtube' && /^UC[\w-]{22}$/.test(a.handle)) {
          const channel = await prisma.videoChannel.findUnique({
            where: { youtubeId: a.handle },
          });
          if (!channel) {
            await prisma.videoChannel.create({
              data: {
                youtubeId: a.handle,
                name: c.name,
                kind: ChannelKind.candidate,
                candidateId: c.id,
                linkedFrom: origin,
                createdById: c.createdById,
              },
            });
            report.channels++;
          }
        }
      }
    }
  }
  return report;
}
