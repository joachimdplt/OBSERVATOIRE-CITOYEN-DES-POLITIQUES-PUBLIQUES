import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { emptyDatabase, reader, startApi } from './harness';

type Updates = {
  schedule: { hour: number; timeZone: string };
  lastRunAt: string | null;
  nextRunAt: string;
  runs: { kind: string; finishedAt: string | null; ok: boolean | null }[];
};

describe('la mise à jour automatique se lit publiquement', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
    await emptyDatabase(prisma);
  });
  afterAll(() => app?.close());

  it('avant toute collecte : aucune date inventée, la prochaine est annoncée', async () => {
    const u = (await reader(app).get('/api/public/updates').expect(200))
      .body as Updates;
    expect(u.schedule).toEqual({ hour: 6, timeZone: 'Europe/Paris' });
    expect(u.lastRunAt).toBeNull();
    expect(new Date(u.nextRunAt).getTime()).toBeGreaterThan(Date.now());
    expect(u.runs.every((r) => r.finishedAt === null)).toBe(true);
  });

  it('après une collecte : la dernière, source par source, avec son résultat', async () => {
    await prisma.collectionRun.create({
      data: {
        kind: 'videos',
        finishedAt: new Date('2026-11-15T05:02:00Z'),
        ok: true,
        summary: { collected: 3 },
      },
    });
    await prisma.collectionRun.create({
      data: {
        kind: 'programmes',
        finishedAt: new Date('2026-11-15T05:01:00Z'),
        ok: false,
        summary: { error: 'réseau' },
      },
    });
    const u = (await reader(app).get('/api/public/updates').expect(200))
      .body as Updates;
    expect(u.lastRunAt).toBe('2026-11-15T05:02:00.000Z');
    expect(u.runs.find((r) => r.kind === 'programmes')).toMatchObject({
      ok: false,
    });
    expect(u.runs.find((r) => r.kind === 'videos')).toMatchObject({ ok: true });
  });
});
