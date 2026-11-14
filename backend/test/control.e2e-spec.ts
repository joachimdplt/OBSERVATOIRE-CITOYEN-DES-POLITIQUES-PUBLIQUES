import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TestAgent from 'supertest/lib/agent';
import { readCog } from '../src/adapters/cog/read-cog';
import { loadCogVintage } from '../src/features/territories/load-cog-vintage/load-cog-vintage';
import { Role } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMember, emptyDatabase, signedIn, startApi } from './harness';

type Uploaded = { version: { id: string }; job: { id: string } };
type Anomaly = {
  rowNumber: number | null;
  kind: string;
  severity: string;
  message: string;
};
type Report = {
  state: string;
  blockingCount: number;
  observations: Record<string, number>;
  anomalies: Anomaly[];
};

const COG = join(__dirname, 'fixtures/cog-2026');
const cog = (name: string) => ({
  url: name,
  content: readFileSync(join(COG, name), 'utf8'),
});

/** Un fichier à la manière de la DREES ; valeurs inventées pour le test. */
const csv = (lines: string[]) =>
  Buffer.from(
    ['Code commune;Commune;APL médecins généralistes', ...lines].join('\n'),
    'utf8',
  );

const GOOD = csv([
  '01001;L’Abergement-Clémenciat;3,3',
  '1053;Bourg-en-Bresse;4,1',
  '2A004;Ajaccio;',
  '97101;Les Abymes;s',
  '13055;Marseille;0',
]);

const DESCRIPTION = {
  headerRow: 1,
  territory: { column: 'Code commune', level: 'commune', vintage: 2026 },
  period: { value: '2024' },
  decimalSeparator: ',',
  values: [
    {
      column: 'APL médecins généralistes',
      indicatorCode: 'apl-medecins-generalistes',
    },
  ],
};

describe('l’équipe décrit les colonnes d’un fichier et le contrôle', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let editor: TestAgent;
  let datasetId: string;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
  });
  beforeEach(async () => {
    await emptyDatabase(prisma);
    const files = [
      'v_region_2026.csv',
      'v_departement_2026.csv',
      'v_commune_2026.csv',
    ].map(cog);
    const [regions, departments, communes] = files.map((f) => f.content);
    await loadCogVintage(
      prisma,
      2026,
      files,
      readCog({ regions, departments, communes }),
    );

    const member = await createMember(prisma, Role.editor);
    editor = await signedIn(app, 'editor@observatoire.test');
    const createdById = member.id;
    const provider = await prisma.dataProvider.create({
      data: {
        name: 'DREES',
        acronym: 'DREES',
        kind: 'statistical_service',
        officialUrl: 'https://drees.solidarites-sante.gouv.fr',
        createdById,
      },
    });
    const dataset = await prisma.sourceDataset.create({
      data: {
        providerId: provider.id,
        producerRef: 'apl',
        title: 'APL',
        url: 'https://data.drees.solidarites-sante.gouv.fr/apl',
        license: 'Licence Ouverte v2.0',
        methodology: 'Méthode concertée',
        frequency: 'annual',
        createdById,
      },
    });
    datasetId = dataset.id;
    await prisma.indicatorDefinition.create({
      data: {
        code: 'apl-medecins-generalistes',
        sources: { create: { datasetId, createdById } },
        label: 'APL aux médecins généralistes',
        definition: 'Consultations accessibles par habitant standardisé.',
        scope: 'Toutes communes.',
        unit: 'consultations par habitant standardisé',
        pillar: 'health',
        allowedAggregations: [],
        method: 'DREES',
        limits: 'Pas un nombre de médecins manquants.',
        createdById,
      },
    });
  });
  afterAll(() => app?.close());

  const deposit = async (file: Buffer, name = 'apl.csv') =>
    (
      (
        await editor
          .post(`/api/admin/datasets/${datasetId}/versions`)
          .field('vintage', '2024')
          .field(
            'fileUrl',
            'https://data.drees.solidarites-sante.gouv.fr/apl.csv',
          )
          .field('collectedAt', '2026-11-14')
          .attach('file', file, name)
          .expect(201)
      ).body as Uploaded
    ).job.id;
  const describe_ = (jobId: string, description: object = DESCRIPTION) =>
    editor.put(`/api/admin/import-jobs/${jobId}/description`).send(description);
  const validate = async (jobId: string) =>
    (await editor.post(`/api/admin/import-jobs/${jobId}/validate`).expect(200))
      .body as Report;

  it('un fichier propre donne ses observations ; une absence reste une absence, un zéro reste un zéro', async () => {
    const jobId = await deposit(GOOD);
    await describe_(jobId).expect(200);
    const report = await validate(jobId);

    expect(report.state).toBe('validated');
    expect(report.observations).toEqual({
      documented: 3,
      not_documented: 1,
      confidential: 1,
      not_applicable: 0,
    });

    const stored = await prisma.observation.findMany({
      include: { territory: { select: { code: true } } },
      orderBy: { rowNumber: 'asc' },
    });
    expect(
      stored.map((o) => [
        o.territory.code,
        o.status,
        o.value?.toString() ?? null,
      ]),
    ).toEqual([
      ['01001', 'documented', '3.3'],
      ['01053', 'documented', '4.1'],
      ['2A004', 'not_documented', null],
      ['97101', 'confidential', null],
      ['13055', 'documented', '0'],
    ]);
  });

  it('dit ce qu’elle a lu sans bloquer : zéro rendu, absences comptées', async () => {
    const jobId = await deposit(GOOD);
    await describe_(jobId).expect(200);
    const kinds = (await validate(jobId)).anomalies.map((a) => [
      a.severity,
      a.kind,
    ]);
    expect(kinds).toEqual(
      expect.arrayContaining([
        ['info', 'territory_code_repaired'],
        ['info', 'absence_not_documented'],
        ['info', 'absence_confidential'],
      ]),
    );
  });

  it('une seule anomalie bloquante, et aucune observation n’est écrite', async () => {
    const jobId = await deposit(
      csv([
        '01001;L’Abergement-Clémenciat;3,3',
        '99999;Nulle part;2,0',
        '01001;Doublon;3,4',
        '2A004;Ajaccio;3.300',
        'Source : DREES;;',
      ]),
    );
    await describe_(jobId).expect(200);
    const report = await validate(jobId);

    expect(report.state).toBe('needs_correction');
    expect(
      report.anomalies
        .filter((a) => a.severity === 'blocking')
        .map((a) => [a.rowNumber, a.kind]),
    ).toEqual([
      [3, 'unknown_territory'],
      [4, 'duplicate'],
      [5, 'invalid_value'],
      [6, 'invalid_territory_code'],
    ]);
    expect(await prisma.observation.count()).toBe(0);
  });

  it('corriger la description et contrôler à nouveau remplace le contrôle précédent', async () => {
    const jobId = await deposit(csv(['01001;A;3,3', 'Source : DREES;;']));
    await describe_(jobId).expect(200);
    expect((await validate(jobId)).state).toBe('needs_correction');

    await describe_(jobId, { ...DESCRIPTION, lastRow: 2 }).expect(200);
    const report = await validate(jobId);
    expect(report.state).toBe('validated');
    expect(report.blockingCount).toBe(0);
    expect(
      await prisma.importAnomaly.count({ where: { severity: 'blocking' } }),
    ).toBe(0);
  });

  it('une description qui ne tient pas est refusée avec chaque raison', async () => {
    const jobId = await deposit(GOOD);
    const res = await describe_(jobId, {
      ...DESCRIPTION,
      territory: { column: 'Code commune', level: 'commune', vintage: 2019 },
      values: [{ column: 'APL 2024', indicatorCode: 'apl-inconnu' }],
    }).expect(400);
    expect((res.body as { message: string[] }).message).toEqual([
      "La colonne « APL 2024 » (valeurs de apl-inconnu) n'existe pas à la ligne 1.",
      "L'indicateur « apl-inconnu » n'est pas défini pour ce jeu.",
      'Les territoires du COG 2019 ne sont pas chargés.',
    ]);
  });

  it('un fichier non décrit ne se contrôle pas', async () => {
    const jobId = await deposit(GOOD);
    await editor.post(`/api/admin/import-jobs/${jobId}/validate`).expect(400);
  });

  it('une version qui n’est plus un brouillon ne se décrit ni ne se contrôle, et la base fige ses observations', async () => {
    const jobId = await deposit(GOOD);
    await describe_(jobId).expect(200);
    await validate(jobId);
    const job = await prisma.importJob.findUniqueOrThrow({
      where: { id: jobId },
    });
    await prisma.datasetVersion.update({
      where: { id: job.versionId },
      data: { state: 'in_review' },
    });

    await describe_(jobId).expect(409);
    await editor.post(`/api/admin/import-jobs/${jobId}/validate`).expect(409);
    await expect(
      prisma.observation.deleteMany({ where: { versionId: job.versionId } }),
    ).rejects.toThrow(/ne changent plus/);
  });

  it('la base refuse une absence qui porterait une valeur', async () => {
    const jobId = await deposit(GOOD);
    await describe_(jobId).expect(200);
    await validate(jobId);
    const absent = await prisma.observation.findFirstOrThrow({
      where: { status: 'not_documented' },
    });
    await expect(
      prisma.observation.update({
        where: { id: absent.id },
        data: { value: 0 },
      }),
    ).rejects.toThrow(/observation_value_matches_status/);
  });
});
