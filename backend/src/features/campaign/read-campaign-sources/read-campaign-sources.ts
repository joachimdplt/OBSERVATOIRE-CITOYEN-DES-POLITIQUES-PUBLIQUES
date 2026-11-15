import { createHash } from 'node:crypto';
import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { CampaignSourceKind } from '../../../generated/prisma/enums';
import {
  CAMPAIGN_PAGE_READER,
  type CampaignPageReader,
} from '../../../ports/campaign-page-reader';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * La lecture des pages de méthode et de consultation de chaque campagne :
 * un diagnostic chiffré, chapitre par chapitre, ou les comptes qu'une
 * consultation publie sur elle-même. Chaque lecture qui change garde un
 * relevé daté ; l'ancien reste.
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class ReadCampaignSourcesController {
  constructor(
    private prisma: PrismaService,
    @Inject(CAMPAIGN_PAGE_READER) private reader: CampaignPageReader,
  ) {}

  @Post('campaign-sources')
  @HttpCode(200)
  read() {
    return readCampaignSources(this.prisma, this.reader);
  }
}

/** Le geste de la lecture, appelé par l'administration ou la collecte quotidienne. */
export async function readCampaignSources(
  prisma: PrismaService,
  reader: CampaignPageReader,
) {
  const sources = await prisma.campaignSource.findMany({
    where: {
      kind: {
        in: [CampaignSourceKind.method, CampaignSourceKind.consultation],
      },
    },
  });
  const report = {
    sources: 0,
    unchanged: 0,
    snapshots: 0,
    failed: [] as string[],
  };
  for (const s of sources) {
    report.sources++;
    try {
      const page = await reader.read(s.url);
      const contentHash = createHash('sha256')
        .update(JSON.stringify([page.title, page.chapters, page.counts]))
        .digest('hex');
      const known = await prisma.campaignSnapshot.findUnique({
        where: { sourceId_contentHash: { sourceId: s.id, contentHash } },
      });
      if (known) {
        report.unchanged++;
        continue;
      }
      await prisma.campaignSnapshot.create({
        data: {
          sourceId: s.id,
          contentHash,
          title: page.title,
          passages: page.chapters,
          figures: page.counts,
        },
      });
      report.snapshots++;
    } catch (e) {
      report.failed.push(`${s.url} : ${String(e)}`);
    }
  }
  return report;
}
