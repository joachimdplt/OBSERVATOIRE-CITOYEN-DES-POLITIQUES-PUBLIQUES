import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { pageKind } from '../../../domain/site-map';
import { SitePageStatus } from '../../../generated/prisma/enums';
import {
  PROGRAMME_READER,
  type ProgrammeReader,
} from '../../../ports/programme-reader';
import { PrismaService } from '../../../prisma/prisma.service';

/** Le nombre de pages lues à chaque passage : peu à peu, sans surcharger les sites. */
export const PAGES_PER_RUN = 20;

/**
 * La lecture d'un petit lot de pages « à lire » : les plus récemment
 * modifiées d'abord. Chaque page lue est découpée en passages mot pour mot
 * et gardée ; une page dont le texte change donne une nouvelle version.
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class ReadSitePagesController {
  constructor(
    private prisma: PrismaService,
    @Inject(PROGRAMME_READER) private reader: ProgrammeReader,
  ) {}

  @Post('site-pages/read')
  @HttpCode(200)
  read() {
    return readSitePages(this.prisma, this.reader);
  }
}

/** Le geste de la lecture, appelé par l'administration ou la tâche planifiée. */
export async function readSitePages(
  prisma: PrismaService,
  reader: ProgrammeReader,
  limit = PAGES_PER_RUN,
) {
  const pages = await prisma.sitePage.findMany({
    where: { status: SitePageStatus.pending },
    orderBy: [{ lastmod: { sort: 'desc', nulls: 'last' } }, { depth: 'asc' }],
    take: limit,
  });
  const report = { read: 0, changed: 0, failed: 0, left: 0 };
  for (const page of pages) {
    try {
      const file = await reader.read(page.url);
      const contentHash = createHash('sha256')
        .update(
          file.passages.map((p) => `${p.heading}\n${p.text}`).join('\n\n'),
        )
        .digest('hex');
      const exists = await prisma.sitePageText.findUnique({
        where: { pageId_contentHash: { pageId: page.id, contentHash } },
      });
      if (!exists) {
        await prisma.sitePageText.create({
          data: {
            pageId: page.id,
            contentHash,
            title: file.title.slice(0, 300),
            passages: file.passages,
          },
        });
        report.changed++;
      }
      await prisma.sitePage.update({
        where: { id: page.id },
        data: {
          title: file.title.slice(0, 300),
          kind: pageKind(page.url, file.title),
          textLength: file.passages.reduce((n, p) => n + p.text.length, 0),
          status: SitePageStatus.read,
          readAt: new Date(),
          error: null,
        },
      });
      report.read++;
    } catch (e) {
      await prisma.sitePage.update({
        where: { id: page.id },
        data: { status: SitePageStatus.failed, error: String(e).slice(0, 300) },
      });
      report.failed++;
    }
  }
  report.left = await prisma.sitePage.count({
    where: { status: SitePageStatus.pending },
  });
  return report;
}
