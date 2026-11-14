import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { matchRank, searchForm } from '../../../domain/search-name';
import { TerritoryLevel } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

const LIMIT = 8;

type Entry = {
  code: string;
  name: string;
  level: TerritoryLevel;
  departmentCode: string | null;
  regionCode: string | null;
};

/**
 * Un visiteur tape le nom de sa commune : les communes et arrondissements du
 * dernier découpage officiel chargé dont le nom commence par la saisie, puis
 * ceux qui la contiennent. Le département distingue les homonymes.
 */
@Controller('public/territories')
export class SearchTerritoriesController {
  private cache: { vintage: number; entries: Entry[] } | null = null;

  constructor(private prisma: PrismaService) {}

  @Get()
  async search(@Query('q') q?: string) {
    if (!q || searchForm(q).length < 2)
      throw new BadRequestException('Tapez au moins deux lettres : ?q=brest');
    const entries = await this.entries();
    return entries
      .map((e) => ({ e, rank: matchRank(e.name, q) }))
      .filter(({ rank }) => rank >= 0)
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          a.e.name.length - b.e.name.length ||
          a.e.name.localeCompare(b.e.name, 'fr'),
      )
      .slice(0, LIMIT)
      .map(({ e }) => e);
  }

  /** Les noms du dernier COG chargé, gardés en mémoire jusqu'au suivant. */
  private async entries(): Promise<Entry[]> {
    const latest = await this.prisma.territoryVintage.findFirst({
      orderBy: { year: 'desc' },
      select: { year: true },
    });
    if (!latest) return [];
    if (this.cache?.vintage !== latest.year) {
      const entries = await this.prisma.territory.findMany({
        where: {
          vintage: latest.year,
          level: {
            in: [TerritoryLevel.commune, TerritoryLevel.municipal_district],
          },
        },
        select: {
          code: true,
          name: true,
          level: true,
          departmentCode: true,
          regionCode: true,
        },
      });
      this.cache = { vintage: latest.year, entries };
    }
    return this.cache.entries;
  }
}
