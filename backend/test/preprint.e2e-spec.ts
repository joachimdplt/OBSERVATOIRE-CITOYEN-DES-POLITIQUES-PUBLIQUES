import { INestApplication } from '@nestjs/common';
import TestAgent from 'supertest/lib/agent';
import { Role } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMember, emptyDatabase, signedIn, startApi } from './harness';
import { seedApl, validatedVersion } from './scenario';

type Version = {
  id: string;
  state: string;
  submittedById: string;
  publishedAt: string;
};
type History = { events: { action: string; by: string }[] };
type QueueLine = { id: string; state: string };

describe('l’administration publie seule, en prépublication', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: TestAgent;
  let editor: TestAgent;
  let reviewer: TestAgent;
  let founderId: string;
  let datasetId: string;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
  });
  beforeEach(async () => {
    await emptyDatabase(prisma);
    founderId = (
      await createMember(prisma, Role.admin, 'joachim@observatoire.test')
    ).id;
    await createMember(prisma, Role.editor, 'alice@observatoire.test');
    await createMember(prisma, Role.reviewer, 'bob@observatoire.test');
    founder = await signedIn(app, 'joachim@observatoire.test');
    editor = await signedIn(app, 'alice@observatoire.test');
    reviewer = await signedIn(app, 'bob@observatoire.test');
    datasetId = await seedApl(prisma, founderId);
  });
  afterAll(() => app?.close());

  const preprint = (versionId: string, agent = founder) =>
    agent.post(`/api/admin/versions/${versionId}/preprint`);
  const stateOf = async (id: string) =>
    (await prisma.datasetVersion.findUniqueOrThrow({ where: { id } })).state;

  it('sans relecteur, la version est prépubliée, signée de son seul auteur', async () => {
    const { versionId } = await validatedVersion(
      founder,
      datasetId,
      '2024',
      '3,3',
    );
    const version = (await preprint(versionId).expect(200)).body as Version;

    expect(version).toMatchObject({
      state: 'preprint',
      submittedById: founderId,
    });
    expect(version.publishedAt).toBeTruthy();
    const history = (
      await founder.get(`/api/admin/versions/${versionId}/history`).expect(200)
    ).body as History;
    expect(history.events.map((e) => [e.action, e.by])).toEqual([
      ['preprinted', 'Compte admin'],
    ]);
  });

  it('pendant le lancement, seule l’administration prépublie', async () => {
    const { versionId } = await validatedVersion(
      editor,
      datasetId,
      '2024',
      '3,3',
    );
    await preprint(versionId, editor).expect(403);
    await preprint(versionId, reviewer).expect(403);
  });

  it('seul un fichier contrôlé sans anomalie bloquante se prépublie', async () => {
    const { versionId, jobId } = await validatedVersion(
      founder,
      datasetId,
      '2024',
      '3,3',
    );
    await founder
      .put(`/api/admin/import-jobs/${jobId}/description`)
      .send({
        headerRow: 1,
        territory: { column: 'Code commune', level: 'commune', vintage: 2026 },
        period: { value: '2024' },
        decimalSeparator: '.',
        values: [{ column: 'APL', indicatorCode: 'apl-medecins-generalistes' }],
      })
      .expect(200);
    await preprint(versionId).expect(400);
  });

  it('un relecteur la fait passer à « publiée » ; son auteur ne le peut pas, ni par l’API ni en base', async () => {
    const { versionId } = await validatedVersion(
      founder,
      datasetId,
      '2024',
      '3,3',
    );
    await preprint(versionId).expect(200);

    const queue = (await reviewer.get('/api/admin/review-queue').expect(200))
      .body as QueueLine[];
    expect(queue).toEqual([
      expect.objectContaining({ id: versionId, state: 'preprint' }),
    ]);

    await founder
      .post(`/api/admin/versions/${versionId}/approve`)
      .send({})
      .expect(403);
    await expect(
      prisma.datasetVersion.update({
        where: { id: versionId },
        data: { state: 'published', reviewedById: founderId },
      }),
    ).rejects.toThrow(/autre personne que celle qui l'a soumise/);

    await reviewer
      .post(`/api/admin/versions/${versionId}/approve`)
      .send({})
      .expect(200);
    expect(await stateOf(versionId)).toBe('published');
  });

  it('une prépublication remplace la version que voyait le public, sans l’effacer', async () => {
    const first = await validatedVersion(founder, datasetId, '2024', '3,3');
    await preprint(first.versionId).expect(200);
    await reviewer
      .post(`/api/admin/versions/${first.versionId}/approve`)
      .send({})
      .expect(200);

    const second = await validatedVersion(founder, datasetId, '2025', '3,4');
    await preprint(second.versionId).expect(200);

    expect(await stateOf(first.versionId)).toBe('superseded');
    expect(await stateOf(second.versionId)).toBe('preprint');
    expect(
      await prisma.datasetVersion.count({
        where: { datasetId, state: { in: ['published', 'preprint'] } },
      }),
    ).toBe(1);
  });

  it('une prépublication est figée : ni ses observations ni son état ne reviennent en arrière', async () => {
    const { versionId } = await validatedVersion(
      founder,
      datasetId,
      '2024',
      '3,3',
    );
    await preprint(versionId).expect(200);

    await expect(
      prisma.observation.deleteMany({ where: { versionId } }),
    ).rejects.toThrow(/ne changent plus/);
    await expect(
      prisma.datasetVersion.update({
        where: { id: versionId },
        data: { state: 'draft' },
      }),
    ).rejects.toThrow(/Transition refusée/);
  });
});
