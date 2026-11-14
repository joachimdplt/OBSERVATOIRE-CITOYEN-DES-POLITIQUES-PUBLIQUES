import { Controller, Get, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

/** L'équipe voit les textes enregistrés et leurs mesures. */
@Controller('admin/political-documents')
@UseGuards(SessionGuard)
@Requires('edit')
export class ListPoliticalDocumentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.politicalDocument.findMany({
      orderBy: { filedAt: 'desc' },
      include: { measures: { orderBy: { createdAt: 'asc' } } },
    });
  }
}
