import { INestApplication } from '@nestjs/common';
import TestAgent from 'supertest/lib/agent';
import { Role } from '../src/generated/prisma/enums';
import type { FeedVideo, VideoFeed } from '../src/ports/video-feed';
import { VIDEO_FEED } from '../src/ports/video-feed';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createMember,
  emptyDatabase,
  reader,
  signedIn,
  startApi,
} from './harness';

const OWN = 'UC' + 'a'.repeat(22);
const PARTY = 'UC' + 'b'.repeat(22);
const SENATE = 'UC' + 'c'.repeat(22);

const video = (id: string, title: string, day: string): FeedVideo => ({
  youtubeId: id,
  title,
  publishedAt: `2026-11-${day}T10:00:00+00:00`,
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnail: null,
});

/** Les flux de trois chaînes, construits pour le test. */
const FEEDS: Record<string, FeedVideo[]> = {
  [OWN]: [video('own1', 'Meeting à Lille', '10')],
  [PARTY]: [
    video('party1', 'Bernard Zola répond à Anne Martin', '11'),
    video('party2', 'Les propos d’Anne Martin sur l’école', '12'),
  ],
  [SENATE]: [
    video('senate1', 'Audition de Anne Martin au Sénat', '13'),
    video('senate2', 'Séance publique du 13 novembre', '13'),
  ],
};
const FEED: VideoFeed = {
  latest: (id) => Promise.resolve(FEEDS[id] ?? []),
  history: () => Promise.resolve([]),
};

type Candidate = {
  channels: { name: string; linkedFrom: string }[];
  videos: { title: string; link: string; channel: { kind: string } }[];
};

describe('les vidéos publiques des candidats, depuis les seules sources primaires', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: TestAgent;
  const P = '/api/public/elections/presidentielle-2027/candidates';

  beforeAll(async () => {
    ({ app, prisma } = await startApi({
      providers: [{ provide: VIDEO_FEED, useValue: FEED }],
    }));
    await emptyDatabase(prisma);
    await createMember(prisma, Role.admin, 'joachim@observatoire.test');
    founder = await signedIn(app, 'joachim@observatoire.test');
    await founder
      .post('/api/admin/elections')
      .send({
        slug: 'presidentielle-2027',
        name: 'Présidentielle',
        criterion: 'c',
      })
      .expect(201);
    for (const [slug, name] of [
      ['anne', 'Anne Martin'],
      ['bernard', 'Bernard Zola'],
    ])
      await founder
        .post('/api/admin/elections/presidentielle-2027/candidates')
        .send({
          slug,
          name,
          party: 'Un parti',
          declaredAt: '2026-05-01',
          declarationSource: 'https://exemple.fr/d',
          programmeStatus: 'none',
          programmeCheckedAt: '2026-11-14',
        })
        .expect(201);
  });
  afterAll(() => app?.close());

  it('une chaîne entre avec la page officielle qui la cite ; une institution ne nomme aucun candidat', async () => {
    const add = (body: object) =>
      founder.post('/api/admin/video-channels').send(body);
    await add({
      youtubeId: OWN,
      name: 'Anne Martin',
      kind: 'candidate',
      candidate: 'presidentielle-2027/anne',
      linkedFrom: 'https://anne.fr/',
    }).expect(201);
    await add({
      youtubeId: PARTY,
      name: 'Le parti de Bernard',
      kind: 'party',
      candidate: 'presidentielle-2027/bernard',
      linkedFrom: 'https://parti.fr/',
    }).expect(201);
    await add({
      youtubeId: SENATE,
      name: 'Sénat',
      kind: 'institution',
      candidate: 'presidentielle-2027/anne',
      linkedFrom: 'https://www.senat.fr/',
    }).expect(400);
    await add({
      youtubeId: SENATE,
      name: 'Sénat',
      kind: 'institution',
      linkedFrom: 'https://www.senat.fr/',
    }).expect(201);
    await add({
      youtubeId: 'x',
      name: 'x',
      kind: 'institution',
      linkedFrom: 'https://x.fr/',
    }).expect(400);
  });

  it('le collecteur garde ce qui concerne un candidat, jamais les propos d’un camp sur un autre', async () => {
    const res = await founder.post('/api/admin/collect/videos').expect(200);
    // own1, party1 (son candidat), senate1 ; ni party2 (un camp sur un autre), ni senate2.
    expect(res.body).toMatchObject({ channels: 3, seen: 5, collected: 3 });
    const again = await founder.post('/api/admin/collect/videos').expect(200);
    expect(again.body).toMatchObject({ collected: 0 });
  });

  it('la page du candidat donne ses vidéos, les plus récentes d’abord, avec la raison du rattachement', async () => {
    const anne = (await reader(app).get(`${P}/anne`).expect(200))
      .body as Candidate;
    expect(anne.channels).toEqual([
      expect.objectContaining({
        name: 'Anne Martin',
        linkedFrom: 'https://anne.fr/',
      }),
    ]);
    expect(anne.videos.map((v) => [v.title, v.link])).toEqual([
      ['Audition de Anne Martin au Sénat', 'name_in_title'],
      ['Meeting à Lille', 'own_channel'],
    ]);
    const bernard = (await reader(app).get(`${P}/bernard`).expect(200))
      .body as Candidate;
    expect(bernard.videos.map((v) => v.title)).toEqual([
      'Bernard Zola répond à Anne Martin',
    ]);
    await reader(app).get(`${P}/inconnu`).expect(404);
  });
});
