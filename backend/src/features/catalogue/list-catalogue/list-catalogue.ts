import { Controller, Get, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * L'équipe voit tout le catalogue : chaque producteur, ses jeux, leurs
 * indicateurs, et qui les a déclarés.
 */
@Controller('admin/catalogue')
@UseGuards(SessionGuard)
@Requires('edit')
export class ListCatalogueController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const declaredBy = { select: { name: true } };
    const providers = await this.prisma.dataProvider.findMany({
      orderBy: { acronym: 'asc' },
      include: {
        createdBy: declaredBy,
        datasets: {
          orderBy: { title: 'asc' },
          include: {
            createdBy: declaredBy,
            indicatorSources: {
              where: { retiredAt: null },
              orderBy: { indicator: { code: 'asc' } },
              include: { indicator: { include: { createdBy: declaredBy } } },
            },
          },
        },
      },
    });
    // Chaque jeu montre les indicateurs qu'il alimente.
    return providers.map((p) => ({
      ...p,
      datasets: p.datasets.map(({ indicatorSources, ...d }) => ({
        ...d,
        indicators: indicatorSources.map((s) => s.indicator),
      })),
    }));
  }
}
