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
type Version = { id: string; state: string };
type History = {
  events: { action: string; by: string; justification: string | null }[];
};
type QueueLine = {
  id: string;
  submittedBy: { name: string };
  observations: Record<string, number>;
};

const COG = join(__dirname, 'fixtures/cog-2026');
const cog = (name: string) => ({
  url: name,
  content: readFileSync(join(COG, name), 'utf8'),
});

/** Valeurs inventées pour le test. */
const apl = (value: string) =>
  Buffer.from(
    ['Code commune;APL', `01001;${value}`, '2A004;', '97101;s'].join('\n'),
    'utf8',
  );

describe('une version se soumet, puis une autre personne l’approuve ou la rejette', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let editor: TestAgent;
  let reviewer: TestAgent;
  let secondReviewer: TestAgent;
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

    const author = await createMember(
      prisma,
      Role.editor,
      'alice@observatoire.test',
    );
    await createMember(prisma, Role.reviewer, 'bob@observatoire.test');
    await createMember(prisma, Role.reviewer, 'carol@observatoire.test');
    editor = await signedIn(app, 'alice@observatoire.test');
    reviewer = await signedIn(app, 'bob@observatoire.test');
    secondReviewer = await signedIn(app, 'carol@observatoire.test');

    const createdById = author.id;
    const provider = await prisma.dataProvider.create({
      data: {
        name: 'DREES',
        acronym: 'DREES',
        kind: 'statistical_service',
        officialUrl: 'https://drees.solidarites-sante.gouv.fr',
        createdById,
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
          createdById,
        },
      })
    ).id;
    await prisma.indicatorDefinition.create({
      data: {
        code: 'apl-medecins-generalistes',
        datasetId,
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

  /** Un fichier déposé, décrit et contrôlé sans anomalie bloquante, par l'autrice. */
  const validatedVersion = async (
    vintage: string,
    value: string,
    agent = editor,
  ) => {
    const { version, job } = (
      await agent
        .post(`/api/admin/datasets/${datasetId}/versions`)
        .field('vintage', vintage)
        .field(
          'fileUrl',
          `https://data.drees.solidarites-sante.gouv.fr/apl-${vintage}.csv`,
        )
        .field('collectedAt', '2026-11-14')
        .attach('file', apl(value), `apl-${vintage}.csv`)
        .expect(201)
    ).body as Uploaded;
    await agent
      .put(`/api/admin/import-jobs/${job.id}/description`)
      .send({
        headerRow: 1,
        territory: { column: 'Code commune', level: 'commune', vintage: 2026 },
        period: { value: vintage },
        decimalSeparator: ',',
        values: [{ column: 'APL', indicatorCode: 'apl-medecins-generalistes' }],
      })
      .expect(200);
    await agent.post(`/api/admin/import-jobs/${job.id}/validate`).expect(200);
    return { versionId: version.id, jobId: job.id };
  };
  const history = async (versionId: string) =>
    (await editor.get(`/api/admin/versions/${versionId}/history`).expect(200))
      .body as History;
  const stateOf = async (versionId: string) =>
    (
      await prisma.datasetVersion.findUniqueOrThrow({
        where: { id: versionId },
      })
    ).state;

  it('soumise par l’autrice, approuvée par un relecteur : la version est publiée et chaque geste est signé', async () => {
    const { versionId } = await validatedVersion('2024', '3,3');
    await editor.post(`/api/admin/versions/${versionId}/submit`).expect(200);

    const queue = (await reviewer.get('/api/admin/review-queue').expect(200))
      .body as QueueLine[];
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      submittedBy: { name: 'Compte editor' },
      observations: { documented: 1, not_documented: 1, confidential: 1 },
    });

    const published = (
      await reviewer
        .post(`/api/admin/versions/${versionId}/approve`)
        .send({})
        .expect(200)
    ).body as Version;
    expect(published.state).toBe('published');
    expect(
      (await history(versionId)).events.map((e) => [e.action, e.by]),
    ).toEqual([
      ['submitted', 'Compte editor'],
      ['approved', 'Compte reviewer'],
    ]);
  });

  it('une personne qui ne relit pas ne peut pas approuver', async () => {
    const { versionId } = await validatedVersion('2024', '3,3');
    await editor.post(`/api/admin/versions/${versionId}/submit`).expect(200);
    await editor
      .post(`/api/admin/versions/${versionId}/approve`)
      .send({})
      .expect(403);
  });

  it('jamais son propre travail : l’API le refuse, et la base aussi', async () => {
    const { versionId } = await validatedVersion('2024', '3,3', reviewer);
    await reviewer.post(`/api/admin/versions/${versionId}/submit`).expect(200);

    const res = await reviewer
      .post(`/api/admin/versions/${versionId}/approve`)
      .send({})
      .expect(403);
    expect((res.body as { message: string }).message).toMatch(/autre personne/);
    await reviewer
      .post(`/api/admin/versions/${versionId}/reject`)
      .send({ justification: 'Je me rejette moi-même.' })
      .expect(403);

    const bob = await prisma.user.findUniqueOrThrow({
      where: { email: 'bob@observatoire.test' },
    });
    await expect(
      prisma.datasetVersion.update({
        where: { id: versionId },
        data: { state: 'published', reviewedById: bob.id },
      }),
    ).rejects.toThrow(/autre personne que celle qui l'a soumise/);
  });

  it('un rejet dit pourquoi, la version redevient un brouillon, se corrige et se soumet à nouveau', async () => {
    const { versionId, jobId } = await validatedVersion('2024', '3,3');
    await editor.post(`/api/admin/versions/${versionId}/submit`).expect(200);

    await reviewer
      .post(`/api/admin/versions/${versionId}/reject`)
      .send({ justification: 'court' })
      .expect(400);
    await reviewer
      .post(`/api/admin/versions/${versionId}/reject`)
      .send({ justification: 'La période est 2024, le fichier dit 2023.' })
      .expect(200);
    expect(await stateOf(versionId)).toBe('draft');

    await editor.post(`/api/admin/import-jobs/${jobId}/validate`).expect(200);
    await editor.post(`/api/admin/versions/${versionId}/submit`).expect(200);
    await secondReviewer
      .post(`/api/admin/versions/${versionId}/approve`)
      .send({})
      .expect(200);

    expect(
      (await history(versionId)).events.map((e) => [e.action, e.justification]),
    ).toEqual([
      ['submitted', null],
      ['rejected', 'La période est 2024, le fichier dit 2023.'],
      ['submitted', null],
      ['approved', null],
    ]);
  });

  it('publier une nouvelle version remplace l’ancienne sans l’effacer', async () => {
    const first = await validatedVersion('2024', '3,3');
    await editor
      .post(`/api/admin/versions/${first.versionId}/submit`)
      .expect(200);
    await reviewer
      .post(`/api/admin/versions/${first.versionId}/approve`)
      .send({})
      .expect(200);

    const second = await validatedVersion('2025', '3,4');
    await editor
      .post(`/api/admin/versions/${second.versionId}/submit`)
      .expect(200);
    await reviewer
      .post(`/api/admin/versions/${second.versionId}/approve`)
      .send({})
      .expect(200);

    expect(await stateOf(first.versionId)).toBe('superseded');
    expect(await stateOf(second.versionId)).toBe('published');
    expect(
      await prisma.observation.count({ where: { versionId: first.versionId } }),
    ).toBe(3);
    expect(
      (await history(first.versionId)).events.map((e) => e.action),
    ).toEqual(['submitted', 'approved', 'superseded']);
  });

  it('seul un fichier contrôlé sans anomalie bloquante se soumet, et une seule fois', async () => {
    const { version } = (
      await editor
        .post(`/api/admin/datasets/${datasetId}/versions`)
        .field('vintage', '2024')
        .field(
          'fileUrl',
          'https://data.drees.solidarites-sante.gouv.fr/apl.csv',
        )
        .field('collectedAt', '2026-11-14')
        .attach('file', apl('9,9'), 'apl.csv')
        .expect(201)
    ).body as Uploaded;
    await editor.post(`/api/admin/versions/${version.id}/submit`).expect(400);

    const { versionId } = await validatedVersion('2025', '3,3');
    await editor.post(`/api/admin/versions/${versionId}/submit`).expect(200);
    await editor.post(`/api/admin/versions/${versionId}/submit`).expect(409);
  });

  it('une version publiée, ses observations et ses traces ne se réécrivent pas', async () => {
    const { versionId } = await validatedVersion('2024', '3,3');
    await editor.post(`/api/admin/versions/${versionId}/submit`).expect(200);
    await reviewer
      .post(`/api/admin/versions/${versionId}/approve`)
      .send({})
      .expect(200);

    await expect(
      prisma.datasetVersion.update({
        where: { id: versionId },
        data: { state: 'draft' },
      }),
    ).rejects.toThrow(/publiée ne change plus/);
    await expect(
      prisma.observation.deleteMany({ where: { versionId } }),
    ).rejects.toThrow(/ne changent plus/);
    await expect(prisma.reviewEvent.deleteMany({})).rejects.toThrow(
      /ne se modifie ni ne se supprime/,
    );
  });
});
