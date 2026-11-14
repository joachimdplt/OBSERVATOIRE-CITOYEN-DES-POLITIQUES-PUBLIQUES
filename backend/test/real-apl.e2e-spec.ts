import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { Role } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createMember,
  emptyDatabase,
  http,
  signedIn,
  startApi,
} from './harness';
import { seedApl } from './scenario';

type Uploaded = { job: { id: string }; version: { id: string } };
type Report = {
  state: string;
  anomalies: { kind: string; severity: string }[];
};
type Values = {
  observations: {
    territory: { level: string; code: string };
    value: string | null;
  }[];
};

/** L'extrait du vrai classeur de la DREES : voir test/fixtures/drees-apl/SOURCE.md. */
const REAL_APL = readFileSync(
  join(__dirname, 'fixtures/drees-apl/apl-medecins-generalistes-extrait.xlsx'),
);

describe('le vrai fichier de l’APL de la DREES passe tout le circuit', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: TestAgent;
  let datasetId: string;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
    await emptyDatabase(prisma);
    const founderId = (
      await createMember(prisma, Role.admin, 'joachim@observatoire.test')
    ).id;
    founder = await signedIn(app, 'joachim@observatoire.test');
    datasetId = await seedApl(prisma, founderId);
  });
  afterAll(() => app?.close());

  it('se lit à son onglet, se décrit avec sa ligne d’unités, se contrôle sans anomalie bloquante, et se lit au public', async () => {
    const { job, version } = (
      await founder
        .post(`/api/admin/datasets/${datasetId}/versions`)
        .field('vintage', '2024')
        .field(
          'fileUrl',
          'https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/catalog/datasets/530_l-accessibilite-potentielle-localisee-apl/attachments/indicateur_d_apl_aux_medecins_generalistes_xlsx',
        )
        .field('collectedAt', '2026-11-14')
        .field('sheet', 'APL 2024')
        .attach(
          'file',
          REAL_APL,
          'Indicateur d’APL aux médecins généralistes.xlsx',
        )
        .expect(201)
    ).body as Uploaded;

    // Ligne 9 : les en-têtes ; ligne 10 : les unités ; données à partir de la ligne 11.
    await founder
      .put(`/api/admin/import-jobs/${job.id}/description`)
      .send({
        headerRow: 9,
        firstRow: 11,
        territory: {
          column: 'Code commune INSEE',
          level: 'commune',
          vintage: 2026,
        },
        period: { value: '2024' },
        decimalSeparator: '.',
        values: [
          {
            column: 'APL aux médecins généralistes',
            indicatorCode: 'apl-medecins-generalistes',
          },
        ],
      })
      .expect(200);
    const report = (
      await founder
        .post(`/api/admin/import-jobs/${job.id}/validate`)
        .expect(200)
    ).body as Report;
    expect(report.state).toBe('validated');
    expect(report.anomalies).toEqual([
      expect.objectContaining({
        kind: 'municipal_districts',
        severity: 'info',
      }),
    ]);

    await founder
      .post(`/api/admin/versions/${version.id}/preprint`)
      .expect(200);
    const { observations } = (
      await request(http(app))
        .get('/api/public/indicators/apl-medecins-generalistes/observations')
        .expect(200)
    ).body as Values;
    expect(
      observations.map((o) => [o.territory.code, o.territory.level, o.value]),
    ).toEqual([
      ['01001', 'commune', '1.953'],
      ['01015', 'commune', '2.927'],
      ['01053', 'commune', '3.196'],
      ['13201', 'municipal_district', '6.573'],
      ['2A004', 'commune', '3.985'],
      ['84007', 'commune', '4.306'],
      ['97101', 'commune', '4.032'],
    ]);
  });

  it('sans la première ligne de données, la ligne d’unités bloque le contrôle', async () => {
    const { job } = (
      await founder
        .post(`/api/admin/datasets/${datasetId}/versions`)
        .field('vintage', '2024-bis')
        .field(
          'fileUrl',
          'https://data.drees.solidarites-sante.gouv.fr/apl.xlsx',
        )
        .field('collectedAt', '2026-11-14')
        .field('sheet', 'APL 2024')
        .attach('file', REAL_APL, 'apl.xlsx')
        .expect(201)
    ).body as Uploaded;
    await founder
      .put(`/api/admin/import-jobs/${job.id}/description`)
      .send({
        headerRow: 9,
        territory: {
          column: 'Code commune INSEE',
          level: 'commune',
          vintage: 2026,
        },
        period: { value: '2024' },
        decimalSeparator: '.',
        values: [
          {
            column: 'APL aux médecins généralistes',
            indicatorCode: 'apl-medecins-generalistes',
          },
        ],
      })
      .expect(200);
    const report = (
      await founder
        .post(`/api/admin/import-jobs/${job.id}/validate`)
        .expect(200)
    ).body as Report;
    expect(report.state).toBe('needs_correction');
  });
});
