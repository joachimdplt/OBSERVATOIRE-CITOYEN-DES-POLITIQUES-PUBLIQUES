import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

/** L'équipe lit l'histoire d'une version : chaque décision, qui, quand, pourquoi. */
@Controller('admin/versions')
@UseGuards(SessionGuard)
@Requires('edit')
export class GetVersionHistoryController {
  constructor(private prisma: PrismaService) {}

  @Get(':id/history')
  async history(@Param('id', ParseUUIDPipe) id: string) {
    const version = await this.prisma.datasetVersion.findUnique({
      where: { id },
    });
    if (!version) throw new NotFoundException('Version inconnue');

    const events = await this.prisma.reviewEvent.findMany({
      where: { subjectType: 'dataset_version', subjectId: id },
      orderBy: { at: 'asc' },
      include: { actor: { select: { name: true } } },
    });
    return {
      id: version.id,
      vintage: version.vintage,
      state: version.state,
      events: events.map((e) => ({
        action: e.action,
        by: e.actor.name,
        at: e.at,
        justification: e.justification,
        before: e.before,
        after: e.after,
      })),
    };
  }
}
