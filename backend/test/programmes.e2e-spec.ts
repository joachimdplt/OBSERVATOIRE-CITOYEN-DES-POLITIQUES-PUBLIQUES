import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { Role } from '../src/generated/prisma/enums';
import type {
  ProgrammeFile,
  ProgrammeReader,
} from '../src/ports/programme-reader';
import { PROGRAMME_READER } from '../src/ports/programme-reader';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createMember,
  emptyDatabase,
  http,
  signedIn,
  startApi,
} from './harness';

const TOC = 'https://anne.fr/programme/';
const PDF = 'https://bernard.fr/programme.pdf';

/** Des programmes en ligne construits pour le test ; le texte d'une page peut changer. */
const pages: Record<string, Omit<ProgrammeFile, 'url' | 'bytes'>> = {
  [TOC]: {
    title: 'Sommaire',
    passages: [],
    links: [
      'https://anne.fr/programme/logement',
      'https://anne.fr/programme/ecole',
      'https://ailleurs.fr/programme/logement',
    ],
  },
  'https://anne.fr/programme/logement': {
    title: 'Logement',
    passages: [
      {
        heading: 'Se loger',
        text: 'Construire 200 000 logements sociaux par an pendant cinq ans.',
      },
    ],
    links: [],
  },
  'https://anne.fr/programme/ecole': {
    title: 'École',
    passages: [
      {
        heading: 'Apprendre',
        text: 'Limiter à vingt le nombre d’élèves par classe en maternelle.',
      },
    ],
    links: [],
  },
  [PDF]: {
    title: 'Programme de Bernard Zola',
    passages: [
      {
        heading: 'Logement',
        text: 'Réduire de moitié les délais des permis de construire.',
      },
    ],
    links: [],
  },
};
const READER: ProgrammeReader = {
  read: (url) => {
    const page = pages[url];
    if (!page) return Promise.reject(new Error(`404 sur ${url}`));
    return Promise.resolve({
      url,
      bytes: Buffer.from(JSON.stringify(page)),
      ...page,
    });
  },
};

type TopicList = {
  programmes: { candidates: number };
  topics: { slug: string; programmes: number; passages: number }[];
};
type TopicSheet = {
  candidates: {
    slug: string;
    passages: { heading: string; quote: string; term: string }[];
  }[];
};

describe('les programmes des candidats : collectés, découpés, rangés par enjeu', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: TestAgent;
  const E = '/api/admin/elections/presidentielle-2027/candidates';

  beforeAll(async () => {
    ({ app, prisma } = await startApi({
      providers: [{ provide: PROGRAMME_READER, useValue: READER }],
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
      ['claire', 'Claire Durand'],
    ])
      await founder
        .post(E)
        .send({
          slug,
          name,
          party: 'Un parti',
          declaredAt: '2026-05-01',
          declarationSource: 'https://exemple.fr/d',
          programmeStatus: slug === 'claire' ? 'none' : 'complete',
          programmeCheckedAt: '2026-11-14',
        })
        .expect(201);
  });
  afterAll(() => app?.close());
  const visitor = () => request(http(app));

  it('l’équipe indique où lire chaque programme, et nomme les enjeux avec leurs termes', async () => {
    await founder
      .post(`${E}/anne/programme-sources`)
      .send({ url: TOC, follow: '^https://anne\\.fr/programme/.+' })
      .expect(201);
    await founder
      .post(`${E}/bernard/programme-sources`)
      .send({ url: PDF })
      .expect(201);
    await founder
      .post(`${E}/bernard/programme-sources`)
      .send({ url: PDF, follow: '([' })
      .expect(400);
    await founder
      .post('/api/admin/topics')
      .send({
        slug: 'logement',
        name: 'Le logement ?',
        pillar: 'housing',
        terms: ['x'],
      })
      .expect(400);
    await founder
      .post('/api/admin/topics')
      .send({
        slug: 'logement-social',
        name: 'Logement social',
        pillar: 'housing',
        terms: ['logements sociaux'],
      })
      .expect(201);
    await founder
      .post('/api/admin/topics')
      .send({
        slug: 'eleves-par-classe',
        name: 'Nombre d’élèves par classe',
        pillar: 'education_research',
        terms: ['élèves par classe'],
      })
      .expect(201);
  });

  it('le collecteur suit la table des matières, garde chaque page et la découpe en passages', async () => {
    const res = await founder.post('/api/admin/collect/programmes').expect(200);
    expect(res.body).toMatchObject({
      pages: 3,
      collected: 3,
      passages: 3,
      matches: 2,
    });
    const again = await founder
      .post('/api/admin/collect/programmes')
      .expect(200);
    expect(again.body).toMatchObject({ pages: 3, unchanged: 3, collected: 0 });
  });

  it('les enjeux se rangent par le nombre de programmes qui en parlent', async () => {
    const res = await visitor().get('/api/public/enjeux').expect(200);
    const list = res.body as TopicList;
    expect(list.programmes.candidates).toBe(2);
    expect(list.topics.map((t) => [t.slug, t.programmes])).toEqual([
      // À égalité, l'ordre alphabétique du nom.
      ['logement-social', 1],
      ['eleves-par-classe', 1],
    ]);
  });

  it('un enjeu cite chaque passage mot pour mot et nomme aussi le programme sans passage', async () => {
    const res = await visitor()
      .get('/api/public/enjeux/logement-social')
      .expect(200);
    const topic = res.body as TopicSheet;
    expect(topic.candidates.map((c) => c.slug)).toEqual(['anne', 'bernard']);
    expect(topic.candidates[0].passages).toEqual([
      {
        heading: 'Se loger',
        quote: 'Construire 200 000 logements sociaux par an pendant cinq ans.',
        term: 'logements sociaux',
        document: expect.objectContaining({
          url: 'https://anne.fr/programme/logement',
        }) as unknown,
      },
    ]);
    expect(topic.candidates[1].passages).toEqual([]);
  });

  it('une page changée entre comme un nouveau document ; seule la plus récente s’affiche', async () => {
    pages['https://anne.fr/programme/logement'] = {
      title: 'Logement',
      passages: [
        {
          heading: 'Se loger',
          text: 'Construire 150 000 logements sociaux par an.',
        },
      ],
      links: [],
    };
    const res = await founder.post('/api/admin/collect/programmes').expect(200);
    expect(res.body).toMatchObject({ collected: 1, unchanged: 2 });
    const topic = (
      await visitor().get('/api/public/enjeux/logement-social').expect(200)
    ).body as TopicSheet;
    expect(topic.candidates[0].passages.map((p) => p.quote)).toEqual([
      'Construire 150 000 logements sociaux par an.',
    ]);
    expect(
      await prisma.politicalDocument.count({ where: { kind: 'programme' } }),
    ).toBe(4);
  });

  it('un terme ajouté à un enjeu relit tous les programmes déjà collectés', async () => {
    await founder
      .post('/api/admin/topics')
      .send({
        slug: 'logement-social',
        name: 'Logement social',
        pillar: 'housing',
        terms: ['logements sociaux', 'permis de construire'],
      })
      .expect(201);
    const topic = (
      await visitor().get('/api/public/enjeux/logement-social').expect(200)
    ).body as TopicSheet;
    expect(topic.candidates[1].passages.map((p) => p.term)).toEqual([
      'permis de construire',
    ]);
  });
});
