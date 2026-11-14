import { INestApplication } from '@nestjs/common';
import TestAgent from 'supertest/lib/agent';
import { Role } from '../src/generated/prisma/enums';
import type { ParliamentSource } from '../src/ports/parliament-source';
import { PARLIAMENT_SOURCE } from '../src/ports/parliament-source';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMember, emptyDatabase, signedIn, startApi } from './harness';

/** Des textes construits pour le test, à la forme des données de l'Assemblée. */
const SOURCE: ParliamentSource = {
  groupsSource: 'https://data.assemblee-nationale.fr/groupes.zip',
  listTexts: () =>
    Promise.resolve([
      {
        sourceRef: 'PIONANR5L17B1311',
        kind: 'bill',
        chamber: 'national_assembly',
        title:
          'Proposition de loi visant à libérer du temps médical afin d’améliorer l’accès aux soins',
        number: '1311',
        filedAt: '2025-04-17',
        firstAuthorRef: 'PA1',
        url: 'https://www.assemblee-nationale.fr/dyn/17/textes/l17b1311_proposition-loi',
        textUrl:
          'https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17B1311.html',
      },
      {
        sourceRef: 'PIONANR5L17B0606',
        kind: 'bill',
        chamber: 'national_assembly',
        title:
          'Proposition de loi visant à rendre obligatoire l’installation des détecteurs de monoxyde de carbone',
        number: '606',
        filedAt: '2024-11-19',
        firstAuthorRef: 'PA2',
        url: 'https://www.assemblee-nationale.fr/x',
        textUrl: 'https://www.assemblee-nationale.fr/y',
      },
    ]),
  members: () =>
    Promise.resolve(
      new Map([
        [
          'PA1',
          {
            name: 'Hadrien Clouet',
            groups: [
              {
                group: 'La France insoumise - Nouveau Front Populaire',
                start: '2024-07-19',
                end: null,
              },
            ],
          },
        ],
      ]),
    ),
  fetchText: () =>
    Promise.resolve(
      '<p>EXPOSÉ DES MOTIFS</p><p>PROPOSITION DE LOI</p><p>Article 1<sup>er</sup></p><p>Il est interdit, pour l’assureur, de solliciter d’un médecin la transmission d’informations.</p><p>Article 2</p><p>La charge est compensée.</p>',
    ),
};

describe('le collecteur : les textes déposés, récupérés et cités sans intervention', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: TestAgent;

  beforeAll(async () => {
    ({ app, prisma } = await startApi({
      providers: [{ provide: PARLIAMENT_SOURCE, useValue: SOURCE }],
    }));
    await emptyDatabase(prisma);
    const id = (
      await createMember(prisma, Role.admin, 'joachim@observatoire.test')
    ).id;
    founder = await signedIn(app, 'joachim@observatoire.test');
    await prisma.publication.create({
      data: {
        slug: 'acces-aux-medecins',
        pillar: 'health',
        createdById: id,
        watchTerms: ['accès aux soins', 'déserts médicaux'],
      },
    });
  });
  afterAll(() => app?.close());

  it('garde les textes dont le titre porte un terme surveillé, avec l’auteur, son groupe et chaque article', async () => {
    const report = (
      await founder.post('/api/admin/collect/parliament').expect(200)
    ).body as Record<string, number>;
    expect(report).toEqual({
      examined: 2,
      matched: 1,
      collected: 1,
      articles: 2,
    });

    const document = await prisma.politicalDocument.findUniqueOrThrow({
      where: { sourceRef: 'PIONANR5L17B1311' },
      include: { measures: { orderBy: { article: 'asc' } }, matches: true },
    });
    expect(document).toMatchObject({
      origin: 'automatic',
      firstAuthor: 'Hadrien Clouet',
      authorGroup: 'La France insoumise - Nouveau Front Populaire',
      authorGroupSource: SOURCE.groupsSource,
    });
    expect(
      document.measures.map((m) => [m.article, m.label, m.origin]),
    ).toEqual([
      ['Article 1er', null, 'automatic'],
      ['Article 2', null, 'automatic'],
    ]);
    expect(document.matches[0].term).toBe('accès aux soins');
  });

  it('ne collecte un texte qu’une fois', async () => {
    const report = (
      await founder.post('/api/admin/collect/parliament').expect(200)
    ).body as Record<string, number>;
    expect(report.collected).toBe(0);
    expect(await prisma.politicalDocument.count()).toBe(1);
  });
});
