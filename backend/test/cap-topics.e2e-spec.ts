import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { emptyDatabase, reader, startApi } from './harness';

type CapTopics = {
  version: string;
  licence: string;
  topics: {
    code: string;
    label: string;
    title: string;
    subtopics: { code: string; label: string; title: string }[];
  }[];
};

describe('les sujets suivent la grille internationale du Comparative Agendas Project', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
    await emptyDatabase(prisma);
    const base = {
      source: 'https://www.comparativeagendas.net/pages/master-codebook',
      version: '1.1',
    };
    await prisma.capTopic.create({
      data: { code: '3', level: 1, title: 'Health', labelFr: 'Santé', ...base },
    });
    await prisma.capTopic.create({
      data: {
        code: '331',
        level: 2,
        majorCode: '3',
        title: 'Disease Prevention',
        description: 'Includes issues related to disease prevention',
        labelFr: 'Prévention des maladies',
        ...base,
      },
    });
  });
  afterAll(() => app?.close());

  it('se lit grand sujet par grand sujet, en français et en anglais officiel, avec sa licence', async () => {
    const body = (await reader(app).get('/api/public/cap-topics').expect(200))
      .body as CapTopics;
    expect(body).toMatchObject({ version: '1.1', licence: 'CC BY-NC-SA 4.0' });
    expect(body.topics).toEqual([
      {
        code: '3',
        label: 'Santé',
        title: 'Health',
        subtopics: [
          {
            code: '331',
            label: 'Prévention des maladies',
            title: 'Disease Prevention',
            description: 'Includes issues related to disease prevention',
          },
        ],
      },
    ]);
  });
});
