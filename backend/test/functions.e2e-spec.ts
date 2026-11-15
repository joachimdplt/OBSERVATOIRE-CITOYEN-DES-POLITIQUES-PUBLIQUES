import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { emptyDatabase, reader, startApi } from './harness';

type Functions = {
  source: string;
  functions: {
    code: string;
    label: string;
    children: { code: string; label: string }[];
  }[];
};

describe('les sujets suivent la nomenclature officielle COFOG', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
    await emptyDatabase(prisma);
    const source = 'https://ec.europa.eu/eurostat/cofog';
    await prisma.cofogFunction.create({
      data: { code: 'GF07', display: '07', level: 1, label: 'Santé', source },
    });
    await prisma.cofogFunction.create({
      data: {
        code: 'GF0703',
        display: '07.3',
        level: 2,
        parentCode: 'GF07',
        label: 'Services hospitaliers',
        source,
      },
    });
  });
  afterAll(() => app?.close());

  it('se lit en arbre, fonction puis sous-fonctions, avec sa source', async () => {
    const res = await reader(app).get('/api/public/functions').expect(200);
    const body = res.body as Functions;
    expect(body.source).toBe('https://ec.europa.eu/eurostat/cofog');
    expect(body.functions).toEqual([
      {
        code: '07',
        label: 'Santé',
        children: [{ code: '07.3', label: 'Services hospitaliers' }],
      },
    ]);
  });
});
