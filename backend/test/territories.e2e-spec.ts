import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCog } from '../src/adapters/cog/read-cog';
import { loadCogVintage } from '../src/features/territories/load-cog-vintage/load-cog-vintage';
import { PrismaService } from '../src/prisma/prisma.service';
import { emptyDatabase, reader, startApi } from './harness';

type TerritoryView = {
  name: string;
  parents: { level: string; code: string; name: string }[];
  source: { producer: string; files: { sha256: string }[] };
};

const DIR = join(__dirname, 'fixtures/cog-2026');
const file = (name: string) => ({
  url: `https://www.insee.fr/fr/statistiques/fichier/8740222/${name}`,
  content: readFileSync(join(DIR, name), 'utf8'),
});

describe('les territoires officiels', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
    await emptyDatabase(prisma);
    const files = [
      file('v_region_2026.csv'),
      file('v_departement_2026.csv'),
      file('v_commune_2026.csv'),
    ];
    const [regions, departments, communes] = files.map((f) => f.content);
    await loadCogVintage(
      prisma,
      2026,
      files,
      readCog({ regions, departments, communes }),
    );
  });
  afterAll(() => app?.close());

  const get = (path: string) =>
    reader(app).get(`/api/public/territories/${path}`);
  const view = (res: { body: unknown }) => res.body as TerritoryView;

  it('un visiteur retrouve une commune, son département et sa région', async () => {
    const res = await get('commune/97101').expect(200);
    expect(res.body).toMatchObject({
      name: 'Les Abymes',
      vintage: 2026,
      parents: [
        { level: 'department', code: '971', name: 'Guadeloupe' },
        { level: 'region', code: '01', name: 'Guadeloupe' },
      ],
    });
  });

  it('chaque territoire dit de quel fichier de l’INSEE il vient', async () => {
    const { source } = view(await get('commune/2A004').expect(200));
    expect(source.producer).toBe('INSEE');
    expect(source.files).toHaveLength(3);
    expect(source.files[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('le code 84 désigne une région ou un département selon le niveau demandé', async () => {
    expect(view(await get('region/84').expect(200)).name).toBe(
      'Auvergne-Rhône-Alpes',
    );
    expect(view(await get('department/84').expect(200)).name).toBe('Vaucluse');
  });

  it('un arrondissement de Marseille remonte à Marseille', async () => {
    const res = await get('municipal_district/13201').expect(200);
    expect(view(res).parents[0]).toMatchObject({
      level: 'commune',
      name: 'Marseille',
    });
  });

  it('un code inconnu ou un niveau inexistant ne renvoie rien d’inventé', async () => {
    await get('commune/99999').expect(404);
    await get('canton/0101').expect(400);
  });

  it('un millésime chargé ne se recharge pas, et un territoire ne se réécrit pas', async () => {
    await expect(loadCogVintage(prisma, 2026, [], [])).rejects.toThrow(
      /déjà chargé/,
    );
    await expect(
      prisma.territory.updateMany({
        where: { code: '97101' },
        data: { name: 'Autre' },
      }),
    ).rejects.toThrow(/ne se réécrit pas/);
  });
});
