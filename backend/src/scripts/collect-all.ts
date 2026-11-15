/**
 * La collecte quotidienne lancée à la main, comme l'API la lance chaque jour
 * à 6 h (heure de Paris) :
 *
 *   npm run collect:all
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { AssembleeOpenData } from '../adapters/assemblee/assemblee-open-data';
import { WebProgrammeReader } from '../adapters/programmes/web-programme-reader';
import { WikimediaPhotos } from '../adapters/wikimedia/wikimedia-photos';
import { WikidataAccounts } from '../adapters/wikimedia/wikidata-accounts';
import { WebsiteAccounts } from '../adapters/web/website-accounts';
import { YoutubeFeed } from '../adapters/youtube/youtube-feed';
import configuration from '../config/configuration';
import { PrismaClient } from '../generated/prisma/client';
import { runDailyCollection } from '../jobs/daily-collection';
import type { PrismaService } from '../prisma/prisma.service';
import { RawFileStore } from '../storage/raw-file-store';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const store = new RawFileStore(new ConfigService(configuration()));
    await runDailyCollection(
      {
        prisma: prisma as unknown as PrismaService,
        keep: (bytes) => store.keep(bytes),
        parliament: new AssembleeOpenData(),
        programmes: new WebProgrammeReader(),
        videos: new YoutubeFeed(),
        photos: new WikimediaPhotos(),
        accounts: new WikidataAccounts(),
        sites: new WebsiteAccounts(),
      },
      console,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
