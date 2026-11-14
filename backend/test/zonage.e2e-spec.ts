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

type Created = { id: string };
type Uploaded = { job: { id: string }; version: { id: string } };
type Report = { state: string; observations: Record<string, number> };
type MapAnswer = { values: [string, string | null, string, string | null][] };
type Sheet = { kind: string; categories: { code: string; label: string }[] };

/** L'extrait de l'annexe 1 de l'arrêté de l'ARS PACA : voir test/fixtures/ars-paca-zonage/SOURCE.md. */
const ZONAGE = readFileSync(
  join(__dirname, 'fixtures/ars-paca-zonage/zonage-medecins-paca-extrait.xlsx'),
);
const CATEGORIES = [
  { code: 'ZIP', label: 'Zone d’intervention prioritaire' },
  { code: 'ZAC', label: 'Zone d’action complémentaire' },
  { code: 'HZ', label: 'Hors zonage' },
];

describe('le zonage officiel des médecins, une catégorie par commune', () => {
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
    await seedApl(prisma, founderId);
    const provider = (
      await founder
        .post('/api/admin/providers')
        .send({
          acronym: 'ARS PACA',
          name: 'Agence régionale de santé Provence-Alpes-Côte d’Azur',
          kind: 'public_operator',
          officialUrl: 'https://www.paca.ars.sante.fr',
        })
        .expect(201)
    ).body as Created;
    datasetId = (
      (
        await founder
          .post('/api/admin/datasets')
          .send({
            providerId: provider.id,
            producerRef: 'arrete-zonage-medecins-2025-12-29',
            title: 'Zonage des médecins libéraux en Provence-Alpes-Côte d’Azur',
            url: 'https://www.paca.ars.sante.fr/zonages-et-aides-linstallation',
            license:
              'Document administratif publié, réutilisation libre (CRPA, art. L. 321-1)',
            methodology:
              'Arrêté du 9 mai 2025 : classement des territoires par APL croissante, dans les plafonds de population fixés par région.',
            frequency: 'irregular',
          })
          .expect(201)
      ).body as Created
    ).id;
  });
  afterAll(() => app?.close());

  it('une catégorie se déclare avec sa liste fermée, et ne s’additionne pas', async () => {
    const indicator = {
      datasetId,
      code: 'zonage-medecins-generalistes',
      label: 'Zonage des médecins généralistes',
      definition:
        'Classement de la commune par l’ARS pour les aides à l’installation des médecins.',
      scope: 'Communes et arrondissements municipaux de la région.',
      unit: 'catégorie de zone',
      pillar: 'health',
      method: 'Arrêté régional, annexe 1.',
      limits:
        'Un classement administratif pour les aides, pas une mesure de l’offre de soins.',
      kind: 'category',
    };
    await founder
      .post('/api/admin/indicators')
      .send({
        ...indicator,
        allowedAggregations: [],
        categories: [CATEGORIES[0]],
      })
      .expect(400);
    await founder
      .post('/api/admin/indicators')
      .send({
        ...indicator,
        allowedAggregations: ['sum'],
        categories: CATEGORIES,
      })
      .expect(400);
    await founder
      .post('/api/admin/indicators')
      .send({ ...indicator, allowedAggregations: [], categories: CATEGORIES })
      .expect(201);
  });

  it('l’annexe de l’arrêté se lit, chaque commune prend sa catégorie, et la carte la donne', async () => {
    const { job, version } = (
      await founder
        .post(`/api/admin/datasets/${datasetId}/versions`)
        .field('vintage', '2025')
        .field('fileUrl', 'https://www.paca.ars.sante.fr/media/149892/download')
        .field('collectedAt', '2026-11-14')
        .attach(
          'file',
          ZONAGE,
          'Arrêté de zonage médecins libéraux Paca 2026.xlsx',
        )
        .expect(201)
    ).body as Uploaded;
    await founder
      .put(`/api/admin/import-jobs/${job.id}/description`)
      .send({
        headerRow: 1,
        territory: { column: 'Code commune', level: 'commune', vintage: 2026 },
        period: { value: '2025' },
        decimalSeparator: ',',
        values: [
          {
            column: 'Zonage 2025',
            indicatorCode: 'zonage-medecins-generalistes',
          },
        ],
      })
      .expect(200);
    const report = (
      await founder
        .post(`/api/admin/import-jobs/${job.id}/validate`)
        .expect(200)
    ).body as Report;
    expect(report).toMatchObject({
      state: 'validated',
      observations: { documented: 2 },
    });
    await founder
      .post(`/api/admin/versions/${version.id}/preprint`)
      .expect(200);

    const sheet = (
      await request(http(app))
        .get('/api/public/indicators/zonage-medecins-generalistes')
        .expect(200)
    ).body as Sheet;
    expect(sheet).toMatchObject({ kind: 'category', categories: CATEGORIES });

    const map = (
      await request(http(app))
        .get(
          '/api/public/indicators/zonage-medecins-generalistes/map?period=2025',
        )
        .expect(200)
    ).body as MapAnswer;
    expect(map.values.sort()).toEqual([
      ['13201', null, 'documented', 'HZ'],
      ['84007', null, 'documented', 'ZAC'],
    ]);
  });

  it('la base refuse une observation qui porterait à la fois un nombre et une catégorie', async () => {
    const observation = await prisma.observation.findFirstOrThrow({
      where: { category: 'ZAC' },
    });
    await expect(
      prisma.$executeRaw`UPDATE observations SET value = 1 WHERE id = ${observation.id}`,
    ).rejects.toThrow();
  });

  it('un même indicateur s’alimente de l’arrêté de chaque ARS ; chaque commune garde la source de sa région', async () => {
    const ara = (
      await founder
        .post('/api/admin/providers')
        .send({
          acronym: 'ARS ARA',
          name: 'Agence régionale de santé Auvergne-Rhône-Alpes',
          kind: 'public_operator',
          officialUrl: 'https://www.auvergne-rhone-alpes.ars.sante.fr',
        })
        .expect(201)
    ).body as Created;
    const araDataset = (
      await founder
        .post('/api/admin/datasets')
        .send({
          providerId: ara.id,
          producerRef: 'zonage-medecins-ara',
          title: 'Zonage des médecins en Auvergne-Rhône-Alpes',
          url: 'https://www.auvergne-rhone-alpes.ars.sante.fr',
          license: 'Document administratif publié',
          methodology: 'Arrêté régional selon l’arrêté du 9 mai 2025.',
          frequency: 'irregular',
        })
        .expect(201)
    ).body as Created;
    const link = () =>
      founder
        .post('/api/admin/indicators/zonage-medecins-generalistes/sources')
        .send({ datasetId: araDataset.id });
    await link().expect(201);
    await link().expect(409);

    // Un fichier construit pour le test, au format de l'annexe : deux communes de l'Ain.
    const csv = Buffer.from(
      'Code commune;Zonage 2025\n01001;ZIP\n01053;HZ\n',
      'utf8',
    );
    const { job, version } = (
      await founder
        .post(`/api/admin/datasets/${araDataset.id}/versions`)
        .field('vintage', '2025')
        .field(
          'fileUrl',
          'https://www.auvergne-rhone-alpes.ars.sante.fr/zonage.csv',
        )
        .field('collectedAt', '2026-11-14')
        .attach('file', csv, 'zonage-ara.csv')
        .expect(201)
    ).body as Uploaded;
    await founder
      .put(`/api/admin/import-jobs/${job.id}/description`)
      .send({
        headerRow: 1,
        territory: { column: 'Code commune', level: 'commune', vintage: 2026 },
        period: { value: '2025' },
        decimalSeparator: ',',
        values: [
          {
            column: 'Zonage 2025',
            indicatorCode: 'zonage-medecins-generalistes',
          },
        ],
      })
      .expect(200);
    await founder.post(`/api/admin/import-jobs/${job.id}/validate`).expect(200);
    await founder
      .post(`/api/admin/versions/${version.id}/preprint`)
      .expect(200);

    const map = (
      await request(http(app))
        .get(
          '/api/public/indicators/zonage-medecins-generalistes/map?period=2025',
        )
        .expect(200)
    ).body as MapAnswer;
    expect(map.values.map((v) => [v[0], v[3]]).sort()).toEqual([
      ['01001', 'ZIP'],
      ['01053', 'HZ'],
      ['13201', 'HZ'],
      ['84007', 'ZAC'],
    ]);

    const producerOf = async (level: string, code: string) =>
      (
        (
          await request(http(app))
            .get(`/api/public/territories/${level}/${code}/values`)
            .expect(200)
        ).body as {
          layers: { indicator: { code: string; producer: string } }[];
        }
      ).layers.find((l) => l.indicator.code === 'zonage-medecins-generalistes')
        ?.indicator.producer;
    expect(await producerOf('commune', '01001')).toBe('ARS ARA');
    expect(await producerOf('commune', '84007')).toBe('ARS PACA');

    const sheet = (
      await request(http(app))
        .get('/api/public/indicators/zonage-medecins-generalistes')
        .expect(200)
    ).body as { provenance: { producer: { acronym: string } }[] };
    expect(sheet.provenance.map((p) => p.producer.acronym).sort()).toEqual([
      'ARS ARA',
      'ARS PACA',
    ]);
  });
});
