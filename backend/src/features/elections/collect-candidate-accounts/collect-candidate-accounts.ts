import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { accountUrl } from '../../../domain/accounts';
import { ChannelKind } from '../../../generated/prisma/enums';
import {
  ACCOUNT_SOURCE,
  type AccountSource,
} from '../../../ports/account-source';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Les comptes publics des candidats, relevés sur leur élément Wikidata : la
 * même source pour tous. Un compte retiré de Wikidata est retiré ici. Une
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
  ) {}

  @Post('candidate-accounts')
  @HttpCode(200)
  collect() {
    return collectCandidateAccounts(this.prisma, this.accounts);
  }
}

/** Le geste du collecteur, appelé par l'administration ou la collecte quotidienne. */
export async function collectCandidateAccounts(
  prisma: PrismaService,
  source: AccountSource,
) {
  const candidates = await prisma.candidate.findMany({
    where: { wikidataId: { not: null } },
  });
  const report = {
    candidates: 0,
    accounts: 0,
    channels: 0,
    failed: [] as string[],
  };
  for (const c of candidates) {
    let found;
    try {
      found = await source.accountsOf(c.wikidataId!);
    } catch (e) {
      report.failed.push(`${c.name} : ${String(e)}`);
      continue;
    }
    report.candidates++;
    const origin = `https://www.wikidata.org/wiki/${c.wikidataId}`;
    const keep = new Set(found.map((a) => `${a.network}:${a.handle}`));
    const existing = await prisma.candidateAccount.findMany({
      where: { candidateId: c.id, source: origin },
    });
    for (const a of existing)
      if (!keep.has(`${a.network}:${a.handle}`))
        await prisma.candidateAccount.delete({ where: { id: a.id } });
    for (const a of found) {
      await prisma.candidateAccount.upsert({
        where: {
          candidateId_network_handle: {
            candidateId: c.id,
            network: a.network,
            handle: a.handle,
          },
        },
        update: { checkedAt: new Date(), source: origin },
        create: {
          candidateId: c.id,
          network: a.network,
          handle: a.handle,
          url: accountUrl(a.network, a.handle),
          source: origin,
        },
      });
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
  return report;
}
