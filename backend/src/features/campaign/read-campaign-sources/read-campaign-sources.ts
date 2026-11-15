import { createHash } from 'node:crypto';
import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { isTopLevel } from '../../../domain/site-map';
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

/**
 * Les pages de fond de chaque site de campagne, trouvées seules : chaque
 * page du menu est lue ; un état des lieux (au moins deux chapitres
 * d'indicateurs) ou une consultation (au moins trois sujets comptés)
 * devient une source, relue chaque jour ensuite.
 */
export async function findCampaignPages(
  prisma: PrismaService,
  reader: CampaignPageReader,
  pause = 300,
) {
  const sites = await prisma.campaignSource.findMany({
    where: { kind: CampaignSourceKind.site },
  });
  const known = new Set(
    (
      await prisma.campaignSource.findMany({
        where: {
          kind: {
            in: [CampaignSourceKind.method, CampaignSourceKind.consultation],
          },
        },
        select: { candidateId: true, url: true },
      })
    ).map((s) => `${s.candidateId} ${s.url.replace(/\/+$/, '')}`),
  );
  const found: string[] = [];
  for (const site of sites) {
    let menu: string[];
    try {
      menu = (await reader.read(site.url)).navigation.filter(isTopLevel);
    } catch {
      continue;
    }
    for (const url of menu) {
      const key = `${site.candidateId} ${url.replace(/\/+$/, '')}`;
      if (known.has(key)) continue;
      known.add(key);
      await new Promise((r) => setTimeout(r, pause));
      try {
        const page = await reader.read(url);
        // Un état des lieux : au moins deux chapitres et cinq indicateurs,
        // dont la plupart citent leur source ; une liste d'articles n'en
        // cite aucune.
        const indicators = page.chapters.flatMap((c) => c.indicators);
        const sourced = indicators.filter((x) => x.source).length;
        const kind =
          page.chapters.length >= 2 &&
          indicators.length >= 5 &&
          sourced * 2 > indicators.length
            ? CampaignSourceKind.method
            : page.counts.filter((c) => c.label).length >= 3
              ? CampaignSourceKind.consultation
              : null;
        if (!kind) continue;
        await prisma.campaignSource.create({
          data: {
            candidateId: site.candidateId,
            kind,
            url,
            createdById: site.createdById,
          },
        });
        found.push(`${kind} ${url}`);
      } catch {
        // Une page illisible n'arrête pas la recherche.
      }
    }
  }
  return found;
}

/** Le geste de la lecture, appelé par l'administration ou la collecte quotidienne. */
export async function readCampaignSources(
  prisma: PrismaService,
  reader: CampaignPageReader,
) {
  const found = await findCampaignPages(prisma, reader);
  const sources = await prisma.campaignSource.findMany({
    where: {
      kind: {
        in: [CampaignSourceKind.method, CampaignSourceKind.consultation],
      },
    },
  });
  const report = {
    found,
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
