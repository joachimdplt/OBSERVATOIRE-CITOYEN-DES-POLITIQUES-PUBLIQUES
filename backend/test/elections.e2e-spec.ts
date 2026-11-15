import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { Role } from '../src/generated/prisma/enums';
import { isFreeLicence, type FreePhoto } from '../src/domain/photo';
import { PHOTO_SOURCE, type PhotoSource } from '../src/ports/photo-source';
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

/** Commons, pour le test : une photo libre pour Q1, une photo non commerciale pour Q2. */
const COMMONS: Record<string, FreePhoto> = {
  Q1: {
    url: 'https://upload.wikimedia.org/a.jpg',
    author: 'Une photographe',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    page: 'https://commons.wikimedia.org/wiki/File:A.jpg',
  },
  Q2: {
    url: 'https://upload.wikimedia.org/b.jpg',
    author: 'Un photographe',
    licence: 'CC BY-NC 2.0',
    licenceUrl: null,
    page: 'https://commons.wikimedia.org/wiki/File:B.jpg',
  },
};
// Le vrai adapter écarte une licence non libre ; le faux fait de même.
const PHOTOS: PhotoSource = {
  photoOf: (id) => {
    const p = COMMONS[id];
    return Promise.resolve(p && isFreeLicence(p.licence) ? p : null);
  },
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
    ({ app, prisma } = await startApi({
      providers: [{ provide: PHOTO_SOURCE, useValue: PHOTOS }],
    }));
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

  it('une photo libre s’affiche avec son crédit ; une licence non commerciale n’entre pas', async () => {
    await founder
      .post('/api/admin/elections/presidentielle-2027/candidates')
      .send(candidate('a', 'Anne Martin', { wikidataId: 'Q1' }))
      .expect(201);
    await founder
      .post('/api/admin/elections/presidentielle-2027/candidates')
      .send(candidate('b', 'Bernard Zola', { wikidataId: 'Q2' }))
      .expect(201);
    await founder
      .post('/api/admin/elections/presidentielle-2027/candidates')
      .send(candidate('b', 'Bernard Zola', { wikidataId: 'Paris' }))
      .expect(400);
    const res = await founder
      .post('/api/admin/collect/candidate-photos')
      .expect(200);
    expect(res.body).toMatchObject({
      candidates: 2,
      photos: 1,
      without: ['Bernard Zola'],
    });
    const { candidates } = (
      await visitor()
        .get('/api/public/elections/presidentielle-2027')
        .expect(200)
    ).body as { candidates: { photo: unknown }[] };
    expect(candidates[0].photo).toEqual({
      url: 'https://upload.wikimedia.org/a.jpg',
      author: 'Une photographe',
      licence: 'CC BY-SA 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      page: 'https://commons.wikimedia.org/wiki/File:A.jpg',
    });
    expect(candidates[1].photo).toBeNull();
  });
});
