import { Controller, Get, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

/** L'équipe voit toutes les publications, chacune avec ses versions et leur état. */
@Controller('admin/publications')
@UseGuards(SessionGuard)
@Requires('edit')
export class ListPublicationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    const name = { select: { name: true } };
    return this.prisma.publication.findMany({
      orderBy: { slug: 'asc' },
      include: {
        versions: {
          orderBy: { number: 'desc' },
          include: {
            createdBy: name,
            submittedBy: name,
            reviewedBy: name,
            sections: {
              orderBy: { position: 'asc' },
              include: {
                indicators: {
                  orderBy: { position: 'asc' },
                  include: {
                    indicator: { select: { code: true, label: true } },
                  },
                },
                measures: {
                  orderBy: { position: 'asc' },
                  include: {
                    measure: {
                      select: {
                        id: true,
                        label: true,
                        document: { select: { title: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
