import { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { existsSync } from 'node:fs';
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

type Uploaded = {
  version: { id: string; state: string; fileHash: string };
  job: { id: string };
};
type Preview = {
  rowCount: number;
  columns: string[];
  sample: { rowNumber: number; cells: string[] }[];
  sheetNames: string[];
  sheet: string | null;
  version: { vintage: string; state: string; depositedBy: string };
};
type VersionLine = { vintage: string; state: string; fileName: string };

/**
 * Un CSV à la manière des fichiers de la DREES : point-virgule, virgule
 * décimale, une valeur absente, un secret statistique. Les valeurs sont
 * inventées pour le test.
 */
const CSV_2024 = Buffer.from(
  'Code commune;Commune;APL médecins généralistes\n' +
    '01001;L’Abergement-Clémenciat;3,3\n' +
    '01002;L’Abergement-de-Varey;\n' +
    '2A004;Ajaccio;s\n',
  'utf8',
);
const CSV_2025 = Buffer.from(
  CSV_2024.toString('utf8').replace('3,3', '3,4'),
  'utf8',
);

const FILE_URL = 'https://data.drees.solidarites-sante.gouv.fr/apl-2024.csv';

describe('l’équipe dépose le fichier d’un producteur', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let editor: TestAgent;
  let datasetId: string;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
  });
  beforeEach(async () => {
    await emptyDatabase(prisma);
    const member = await createMember(prisma, Role.editor);
    editor = await signedIn(app, 'editor@observatoire.test');
    const provider = await prisma.dataProvider.create({
      data: {
        name: 'DREES',
        acronym: 'DREES',
        kind: 'statistical_service',
        officialUrl: 'https://drees.solidarites-sante.gouv.fr',
        createdById: member.id,
      },
    });
    datasetId = (
      await prisma.sourceDataset.create({
        data: {
          providerId: provider.id,
          producerRef: 'apl',
          title: 'APL',
          url: 'https://data.drees.solidarites-sante.gouv.fr/apl',
          license: 'Licence Ouverte v2.0',
          methodology: 'Méthode concertée',
          frequency: 'annual',
          createdById: member.id,
        },
      })
    ).id;
  });
  afterAll(() => app?.close());

  const upload = (
    file: Buffer,
    name: string,
    vintage = '2024',
    agent = editor,
  ) =>
    agent
      .post(`/api/admin/datasets/${datasetId}/versions`)
      .field('vintage', vintage)
      .field('fileUrl', FILE_URL)
      .field('collectedAt', '2026-11-14')
      .attach('file', file, name);

  it('un CSV déposé devient une version en brouillon, lue ligne à ligne', async () => {
    const { version, job } = (
      await upload(CSV_2024, 'apl-2024.csv').expect(201)
    ).body as Uploaded;
    expect(version.state).toBe('draft');

    const preview = (
      await editor.get(`/api/admin/import-jobs/${job.id}`).expect(200)
    ).body as Preview;
    expect(preview.rowCount).toBe(4);
    expect(preview.columns).toEqual([
      'Code commune',
      'Commune',
      'APL médecins généralistes',
    ]);
    expect(preview.sample).toEqual([
      { rowNumber: 2, cells: ['01001', 'L’Abergement-Clémenciat', '3,3'] },
      { rowNumber: 3, cells: ['01002', 'L’Abergement-de-Varey', ''] },
      { rowNumber: 4, cells: ['2A004', 'Ajaccio', 's'] },
    ]);
    expect(preview.version).toMatchObject({
      vintage: '2024',
      depositedBy: 'Compte editor',
    });
  });

  it('le fichier brut est gardé sous son empreinte', async () => {
    const { version } = (await upload(CSV_2024, 'apl-2024.csv').expect(201))
      .body as Uploaded;
    expect(version.fileHash).toMatch(/^[0-9a-f]{64}$/);
    expect(existsSync(join(process.env.STORAGE_DIR!, version.fileHash))).toBe(
      true,
    );
  });

  it('une nouvelle version ne remplace pas l’ancienne', async () => {
    await upload(CSV_2024, 'apl-2024.csv', '2024').expect(201);
    await upload(CSV_2025, 'apl-2025.csv', '2025').expect(201);
    const versions = (
      await editor.get(`/api/admin/datasets/${datasetId}/versions`).expect(200)
    ).body as VersionLine[];
    expect(versions.map((v) => v.vintage)).toEqual(['2025', '2024']);
  });

  it('le même fichier ne se dépose pas deux fois', async () => {
    await upload(CSV_2024, 'apl-2024.csv').expect(201);
    const res = await upload(CSV_2024, 'copie.csv', 'autre').expect(409);
    expect((res.body as { message: string }).message).toMatch(/déjà déposé/);
  });

  it('un classeur se lit à l’onglet demandé, et la liste des onglets est gardée', async () => {
    const book = new ExcelJS.Workbook();
    book.addWorksheet('Lisez-moi').addRow(['Source : DREES']);
    const data = book.addWorksheet('Communes');
    data.addRow(['Code commune', 'APL']);
    data.addRow(['01001', 3.2871]);
    const file = Buffer.from(await book.xlsx.writeBuffer());

    const { job } = (
      await editor
        .post(`/api/admin/datasets/${datasetId}/versions`)
        .field('vintage', '2024')
        .field('fileUrl', FILE_URL)
        .field('collectedAt', '2026-11-14')
        .field('sheet', 'Communes')
        .attach('file', file, 'APL 2024.xlsx')
        .expect(201)
    ).body as Uploaded;
    const preview = (
      await editor.get(`/api/admin/import-jobs/${job.id}`).expect(200)
    ).body as Preview;
    expect(preview.sheetNames).toEqual(['Lisez-moi', 'Communes']);
    expect(preview.sheet).toBe('Communes');
    expect(preview.sample[0].cells).toEqual(['01001', '3.2871']);
  });

  it('un format que l’observatoire ne lit pas encore est refusé, sans rien créer', async () => {
    await upload(Buffer.from('%PDF-1.7'), 'panorama.pdf').expect(400);
    expect(await prisma.datasetVersion.count()).toBe(0);
  });

  it('un fichier sans adresse d’origine ne se dépose pas', async () => {
    await editor
      .post(`/api/admin/datasets/${datasetId}/versions`)
      .field('vintage', '2024')
      .field('collectedAt', '2026-11-14')
      .attach('file', CSV_2024, 'apl.csv')
      .expect(400);
  });

  it('un fichier déposé et ses lignes ne se réécrivent pas', async () => {
    const { version, job } = (
      await upload(CSV_2024, 'apl-2024.csv').expect(201)
    ).body as Uploaded;
    await expect(
      prisma.rawRow.updateMany({
        where: { jobId: job.id },
        data: { cells: [] },
      }),
    ).rejects.toThrow(/ne se réécrivent pas/);
    await expect(
      prisma.datasetVersion.update({
        where: { id: version.id },
        data: { fileHash: 'x' },
      }),
    ).rejects.toThrow(/ne se réécrivent pas/);
    await expect(
      prisma.datasetVersion.delete({ where: { id: version.id } }),
    ).rejects.toThrow(/ne se réécrivent pas/);
  });

  it('sans session, rien ne se dépose', async () => {
    await request(http(app))
      .post(`/api/admin/datasets/${datasetId}/versions`)
      .attach('file', CSV_2024, 'apl.csv')
      .expect(401);
  });
});
