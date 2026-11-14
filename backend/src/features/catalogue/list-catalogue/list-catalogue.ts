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
  list() {
    const declaredBy = { select: { name: true } };
    return this.prisma.dataProvider.findMany({
      orderBy: { acronym: 'asc' },
      include: {
        createdBy: declaredBy,
        datasets: {
          orderBy: { title: 'asc' },
          include: {
            createdBy: declaredBy,
            indicators: {
              orderBy: { code: 'asc' },
              include: { createdBy: declaredBy },
            },
          },
        },
      },
    });
  }
}
