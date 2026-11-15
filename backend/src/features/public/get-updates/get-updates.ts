import { Controller, Get } from '@nestjs/common';
import {
  DAILY_HOUR,
  DAILY_TIME_ZONE,
  nextDailyRun,
} from '../../../domain/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

const KINDS = [
  { kind: 'parliament', label: 'Textes déposés à l’Assemblée' },
  { kind: 'programmes', label: 'Programmes des candidats' },
  { kind: 'accounts', label: 'Comptes publics des candidats' },
  { kind: 'videos', label: 'Vidéos des chaînes suivies' },
  { kind: 'photos', label: 'Photos des candidats' },
];

/**
 * Où en est la mise à jour automatique : l'heure de la collecte quotidienne,
 * la prochaine, et pour chaque source la dernière collecte terminée, avec
 * son résultat.
 */
@Controller('public/updates')
export class GetUpdatesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async get() {
    const now = new Date();
    const runs = await Promise.all(
      KINDS.map(async ({ kind, label }) => {
        const last = await this.prisma.collectionRun.findFirst({
          where: { kind, finishedAt: { not: null } },
          orderBy: { finishedAt: 'desc' },
        });
        return {
          kind,
          label,
          finishedAt: last?.finishedAt?.toISOString() ?? null,
          ok: last?.ok ?? null,
        };
      }),
    );
    const done = runs
      .map((r) => r.finishedAt)
      .filter((d): d is string => d !== null)
      .sort();
    return {
      schedule: { hour: DAILY_HOUR, timeZone: DAILY_TIME_ZONE },
      now: now.toISOString(),
      lastRunAt: done.at(-1) ?? null,
      nextRunAt: nextDailyRun(now).toISOString(),
      runs,
    };
  }
}
