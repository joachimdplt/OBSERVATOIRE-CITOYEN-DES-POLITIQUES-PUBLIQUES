import { INestApplication } from '@nestjs/common';
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

type Election = {
  name: string;
  criterion: string;
  candidates: {
    slug: string;
    programmeStatus: string;
    programmeUrl: string | null;
    programmeCheckedAt: string;
  }[];
};

const candidate = (slug: string, name: string, extra = {}) => ({
  slug,
  name,
  party: 'Un parti',
  declaredAt: '2026-05-01',
  declarationSource: 'https://exemple.fr/declaration',
  programmeStatus: 'none',
  programmeCheckedAt: '2026-11-14',
  ...extra,
});

describe('une élection : les candidats déclarés et l’état de leur programme', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: TestAgent;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
    await emptyDatabase(prisma);
    await createMember(prisma, Role.admin, 'joachim@observatoire.test');
    founder = await signedIn(app, 'joachim@observatoire.test');
  });
  afterAll(() => app?.close());
  const visitor = () => request(http(app));

  it('s’inscrit avec son critère, puis chaque candidat avec sa source', async () => {
    await visitor()
      .post('/api/admin/elections')
      .send({ slug: 'p', name: 'P', criterion: 'c' })
      .expect(401);
    await founder
      .post('/api/admin/elections')
      .send({
        slug: 'presidentielle-2027',
        name: 'Élection présidentielle 2027',
        criterion:
          'Toute personne qui a déclaré sa candidature, avec une source.',
      })
      .expect(201);

    await founder
      .post('/api/admin/elections/presidentielle-2027/candidates')
      .send(candidate('b', 'Bernard Zola'))
      .expect(201);
    await founder
      .post('/api/admin/elections/presidentielle-2027/candidates')
      .send(
        candidate('a', 'Anne Martin', {
          programmeStatus: 'complete',
          programmeUrl: 'https://exemple.fr/programme',
        }),
      )
      .expect(201);
    // Un état hors des trois prévus est refusé.
    await founder
      .post('/api/admin/elections/presidentielle-2027/candidates')
      .send(candidate('c', 'Claire Durand', { programmeStatus: 'promis' }))
      .expect(400);
    await founder
      .post('/api/admin/elections/inconnue/candidates')
      .send(candidate('d', 'Denis Roy'))
      .expect(404);
  });

  it('se lit publiquement, candidats par ordre alphabétique du nom', async () => {
    const res = await visitor()
      .get('/api/public/elections/presidentielle-2027')
      .expect(200);
    const election = res.body as Election;
    expect(election.criterion).toContain('avec une source');
    expect(election.candidates.map((c) => c.slug)).toEqual(['a', 'b']);
    expect(election.candidates[0].programmeStatus).toBe('complete');
    expect(election.candidates[1]).toMatchObject({
      programmeStatus: 'none',
      programmeUrl: null,
      programmeCheckedAt: '2026-11-14',
    });
  });

  it('un nouvel état du programme met à jour le candidat, sans le doubler', async () => {
    await founder
      .post('/api/admin/elections/presidentielle-2027/candidates')
      .send(
        candidate('b', 'Bernard Zola', {
          programmeStatus: 'partial',
          programmeUrl: 'https://exemple.fr/livret',
          programmeCheckedAt: '2026-11-20',
        }),
      )
      .expect(201);
    const res = await visitor()
      .get('/api/public/elections/presidentielle-2027')
      .expect(200);
    const { candidates } = res.body as Election;
    expect(candidates).toHaveLength(2);
    expect(candidates[1]).toMatchObject({
      programmeStatus: 'partial',
      programmeCheckedAt: '2026-11-20',
    });
  });
});
