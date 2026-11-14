import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TestAgent from 'supertest/lib/agent';
import { Role } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMember, emptyDatabase, signedIn, startApi } from './harness';
import { seedApl } from './scenario';

type Uploaded = { job: { id: string }; version: { id: string } };
type Report = {
  state: string;
  observations: Record<string, number>;
  anomalies: { kind: string; severity: string }[];
};

/** Classeur construit pour le test, à la forme de la DREES : voir test/fixtures/drees-demographie/SOURCE.md. */
const WORKBOOK = readFileSync(
  join(__dirname, 'fixtures/drees-demographie/medecins-extrait.xlsx'),
);
const URL =
  'https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/catalog/datasets/la-demographie-des-professionnels-de-sante-depuis-2012/attachments/medecins_rpps_2012_2026_xlsx';
const GP_LIBERAL = [
  { column: 'specialites', equals: '01-Médecine générale' },
  { column: 'exercice', equals: '1-Libéral' },
  { column: 'sexe', equals: '0-Ensemble' },
];

describe('l’âge des médecins généralistes, par département', () => {
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
    const indicator = (code: string, label: string, unit: string) =>
      founder
        .post('/api/admin/indicators')
        .send({
          datasetId,
          code,
          label,
          definition: label,
          scope: 'Médecins généralistes libéraux, par département.',
          unit,
          pillar: 'health',
          allowedAggregations: [],
          method: 'RPPS, traitements DREES.',
          limits: 'Par département, pas par commune.',
        })
        .expect(201);
    await indicator(
      'generalistes-liberaux-60-64-ans',
      'Généralistes libéraux de 60 à 64 ans',
      'médecins',
    );
    await indicator(
      'age-moyen-generalistes-liberaux',
      'Âge moyen des généralistes libéraux',
      'ans',
    );
  });
  afterAll(() => app?.close());

  const upload = (sheet: string) =>
    founder
      .post(`/api/admin/datasets/${datasetId}/versions`)
      .field('vintage', '2026')
      .field('fileUrl', URL)
      .field('collectedAt', '2026-11-14')
      .field('sheet', sheet)
      .attach('file', WORKBOOK, 'medecins_rpps_2012_2026.xlsx');

  it('les effectifs se lisent filtrés : une spécialité, un mode d’exercice, les deux sexes', async () => {
    const { job } = (await upload('Effectifs').expect(201)).body as Uploaded;
    await founder
      .put(`/api/admin/import-jobs/${job.id}/description`)
      .send({
        headerRow: 1,
        territory: {
          column: 'departement',
          level: 'department',
          vintage: 2026,
          codeWithLabel: true,
        },
        period: { value: '2026' },
        decimalSeparator: '.',
        confidentialMarkers: ['ND'],
        zeroMarkers: ['.'],
        rowFilters: [
          ...GP_LIBERAL,
          { column: 'departement', notEquals: '000-Ensemble' },
        ],
        values: [
          {
            column: 'effectif_2026',
            indicatorCode: 'generalistes-liberaux-60-64-ans',
            when: [{ column: 'tranche_age', equals: '08-entre 60 et 64 ans' }],
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
    // Ain : 42 ; Corse-du-Sud : secret ; Vaucluse : zéro publié.
    expect(report.observations).toMatchObject({
      documented: 2,
      confidential: 1,
    });
    const values = await prisma.observation.findMany({
      where: { indicator: { code: 'generalistes-liberaux-60-64-ans' } },
      select: { value: true, territory: { select: { code: true } } },
      orderBy: { territory: { code: 'asc' } },
    });
    expect(
      values.map((v) => [v.territory.code, v.value?.toString() ?? null]),
    ).toEqual([
      ['01', '42'],
      ['2A', null],
      ['84', '0'],
    ]);
  });

  it('un autre onglet du même classeur se dépose pour la même année ; le même onglet, non', async () => {
    const { job } = (await upload('Ages moyens').expect(201)).body as Uploaded;
    await upload('Ages moyens').expect(409);
    await founder
      .put(`/api/admin/import-jobs/${job.id}/description`)
      .send({
        headerRow: 1,
        territory: {
          column: 'departement',
          level: 'department',
          vintage: 2026,
          codeWithLabel: true,
        },
        period: { value: '2026' },
        decimalSeparator: '.',
        rowFilters: GP_LIBERAL,
        values: [
          {
            column: 'am_2026',
            indicatorCode: 'age-moyen-generalistes-liberaux',
          },
        ],
      })
      .expect(200);
    const report = (
      await founder
        .post(`/api/admin/import-jobs/${job.id}/validate`)
        .expect(200)
    ).body as Report;
    expect(report.observations).toMatchObject({ documented: 1 });
  });

  it('les deux onglets prépubliés restent visibles ensemble : l’un ne remplace pas l’autre', async () => {
    const drafts = await prisma.datasetVersion.findMany({
      where: { datasetId, vintage: '2026' },
    });
    for (const v of drafts)
      await founder.post(`/api/admin/versions/${v.id}/preprint`).expect(200);
    const states = await prisma.datasetVersion.findMany({
      where: { datasetId, vintage: '2026' },
      select: { sheet: true, state: true },
      orderBy: { sheet: 'asc' },
    });
    expect(states).toEqual([
      { sheet: 'Ages moyens', state: 'preprint' },
      { sheet: 'Effectifs', state: 'preprint' },
    ]);
  });
});
