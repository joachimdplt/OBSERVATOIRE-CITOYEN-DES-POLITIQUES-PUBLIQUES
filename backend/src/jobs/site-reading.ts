import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { readSitePages } from '../features/campaign/read-site-pages/read-site-pages';
import {
  PROGRAMME_READER,
  type ProgrammeReader,
} from '../ports/programme-reader';
import { PrismaService } from '../prisma/prisma.service';

/**
 * La lecture des sites, peu à peu : toutes les quinze minutes, un petit lot
 * de pages « à lire ». Les sites de campagne alimentent ainsi la base de
 * chaque candidat sans être surchargés.
 */
@Injectable()
export class SiteReading {
  private readonly log = new Logger('Lecture des sites');
  private running = false;

  constructor(
    private prisma: PrismaService,
    @Inject(PROGRAMME_READER) private reader: ProgrammeReader,
  ) {}

  @Cron('*/15 * * * *', {
    name: 'lecture-des-sites',
    disabled: process.env.COLLECTION_SCHEDULE === 'off',
  })
  async run() {
    // Un lot à la fois : le suivant attend la fin du précédent.
    if (this.running) return;
    this.running = true;
    try {
      const report = await readSitePages(this.prisma, this.reader);
      if (report.read || report.failed) this.log.log(JSON.stringify(report));
    } finally {
      this.running = false;
    }
  }
}
