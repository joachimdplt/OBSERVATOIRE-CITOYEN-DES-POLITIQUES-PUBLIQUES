import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../src/generated/prisma/enums';
import {
  TABULAR_SOURCE,
  type TabularSource,
} from '../src/ports/tabular-source';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createMember,
  emptyDatabase,
  http,
  signedIn,
  startApi,
} from './harness';

let modified = new Date('2026-07-09T11:59:52Z');
let calls = 0;
/** Une source construite pour le test, à la forme de la base communale du ministère. */
const SOURCE: TabularSource = {
  rowsUrl: (r, c, v) => `https://tabular.test/${r}?${c}=${v}`,
  lastModified: () => Promise.resolve(modified),
  rows: (_r, _c, value) => {
    calls++;
    return Promise.resolve([
      {
        __id: 1,
        CODGEO_2026: value,
        annee: 2025,
        indicateur: 'Destructions et dégradations volontaires',
        unite_de_compte: 'Infraction',
        nombre: calls === 1 ? 10 : 12,
        est_diffuse: 'diff',
      },
      {
        __id: 2,
        CODGEO_2026: value,
        annee: 2025,
        indicateur: 'Cambriolages de logement',
        unite_de_compte: 'Infraction',
        nombre: null,
        est_diffuse: 'ndiff',
      },
    ]);
  },
};

describe('une source lue à la demande, commune par commune', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await startApi({
      providers: [{ provide: TABULAR_SOURCE, useValue: SOURCE }],
    }));
    await emptyDatabase(prisma);
    await createMember(prisma, Role.admin, 'joachim@observatoire.test');
    const founder = await signedIn(app, 'joachim@observatoire.test');
    await founder
      .post('/api/admin/live-sources')
      .send({
        slug: 'delinquance',
        title: 'Crimes et délits enregistrés, par commune',
        producer: 'SSMSI',
        pillar: 'security_justice_defence',
        datasetUrl: 'https://www.data.gouv.fr/datasets/x',
        resourceId: 'r1',
        license: 'Licence Ouverte v2.0',
        layout: {
          territoryColumn: 'CODGEO_2026',
          periodColumn: 'annee',
          labelColumn: 'indicateur',
          unitColumn: 'unite_de_compte',
          values: [{ column: 'nombre', unit: 'nombre' }],
          secret: { column: 'est_diffuse', marker: 'ndiff' },
        },
      })
      .expect(201);
  });
  afterAll(() => app?.close());

  type Live = {
    sources: {
      fetchedAt: string;
      values: { label: string; value: string | null; status: string }[];
    }[];
  };
  const read = async () =>
    (
      await request(http(app))
        .get('/api/public/territories/commune/45290/live')
        .expect(200)
    ).body as Live;

  it('lit les lignes de la commune chez le producteur, et le secret reste secret', async () => {
    const { sources } = await read();
    expect(sources[0].values.map((v) => [v.label, v.value, v.status])).toEqual([
      ['Destructions et dégradations volontaires', '10', 'documented'],
      ['Cambriolages de logement', null, 'confidential'],
    ]);
    expect(calls).toBe(1);
  });

  it('réutilise la lecture tant qu’elle est fraîche', async () => {
    await read();
    expect(calls).toBe(1);
  });

  it('relit quand le fichier a changé chez le producteur, et garde l’ancienne lecture', async () => {
    // La lecture vieillit d'un jour, et le fichier change.
    await prisma.$executeRawUnsafe(
      `SET session_replication_role = replica; UPDATE live_readings SET "fetchedAt" = now() - interval '2 days'; SET session_replication_role = origin;`,
    );
    modified = new Date('2026-11-14T00:00:00Z');
    const { sources } = await read();
    expect(sources[0].values[0].value).toBe('12');
    expect(calls).toBe(2);
    expect(await prisma.liveReading.count()).toBe(2);
  });
});
