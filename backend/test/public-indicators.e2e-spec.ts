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
import { seedApl, validatedVersion } from './scenario';

type Provenance = {
  status: string;
  statusLabel: string;
  producer: { acronym: string };
  version: {
    vintage: string;
    fileUrl: string;
    authoredBy: string;
    reviewedBy: string | null;
  };
  licenses: {
    content: { name: string };
    data: { name: string };
    sourceCode: { license: string; url: string };
  };
};
type Line = {
  code: string;
  status: string;
  statusLabel: string;
  vintage: string;
  vintages: string[];
};
type Sheet = {
  code: string;
  limits: string;
  periods: string[];
  territoryLevels: string[];
  provenance: Provenance[];
};
type Values = {
  total: number;
  observations: {
    territory: { code: string; name: string };
    period: string;
    status: string;
    value: string | null;
    sourceRow: number;
    vintage: string;
  }[];
  provenance: Provenance[];
};

const CODE = 'apl-medecins-generalistes';

describe('le public consulte un indicateur', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: TestAgent;
  let reviewer: TestAgent;
  let datasetId: string;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
  });
  beforeEach(async () => {
    await emptyDatabase(prisma);
    const founderId = (
      await createMember(prisma, Role.admin, 'joachim@observatoire.test')
    ).id;
    await createMember(prisma, Role.reviewer, 'bob@observatoire.test');
    founder = await signedIn(app, 'joachim@observatoire.test');
    reviewer = await signedIn(app, 'bob@observatoire.test');
    datasetId = await seedApl(prisma, founderId);
  });
  afterAll(() => app?.close());

  const visitor = () => request(http(app));
  const preprinted = async (vintage: string, value: string) => {
    const { versionId } = await validatedVersion(
      founder,
      datasetId,
      vintage,
      value,
    );
    await founder.post(`/api/admin/versions/${versionId}/preprint`).expect(200);
    return versionId;
  };

  it('un indicateur sans version visible n’existe pas pour le public, même déposé et contrôlé', async () => {
    await validatedVersion(founder, datasetId, '2024', '3,3');
    expect(
      (await visitor().get('/api/public/indicators').expect(200)).body,
    ).toEqual([]);
    await visitor().get(`/api/public/indicators/${CODE}`).expect(404);
    await visitor()
      .get(`/api/public/indicators/${CODE}/observations`)
      .expect(404);
  });

  it('une prépublication se lit avec son étiquette', async () => {
    await preprinted('2024', '3,3');
    const [line] = (await visitor().get('/api/public/indicators').expect(200))
      .body as Line[];
    expect(line).toMatchObject({
      code: CODE,
      status: 'preprint',
      statusLabel:
        'Prépublication : vérifiée par son seul auteur, en attente de relecture',
      vintage: '2024',
    });
  });

  it('la fiche dit ce que mesure l’indicateur, ce qu’il ne dit pas, et d’où viennent les chiffres', async () => {
    await preprinted('2024', '3,3');
    const sheet = (
      await visitor().get(`/api/public/indicators/${CODE}`).expect(200)
    ).body as Sheet;
    expect(sheet).toMatchObject({
      limits: 'Pas un nombre de médecins manquants.',
      periods: ['2024'],
      territoryLevels: ['commune'],
    });
    expect(sheet.provenance).toHaveLength(1);
    expect(sheet.provenance[0]).toMatchObject({
      producer: { acronym: 'DREES' },
      version: {
        vintage: '2024',
        fileUrl: 'https://data.drees.solidarites-sante.gouv.fr/apl-2024.csv',
        authoredBy: 'Compte admin',
        reviewedBy: null,
      },
      licenses: {
        content: { name: 'CC BY-SA 4.0' },
        data: { name: 'Licence Ouverte v2.0' },
        sourceCode: { license: 'AGPL-3.0' },
      },
    });
  });

  it('une absence se lit comme une absence, jamais comme un zéro, avec la ligne du fichier d’origine', async () => {
    await preprinted('2024', '3,3');
    const { total, observations } = (
      await visitor()
        .get(`/api/public/indicators/${CODE}/observations`)
        .expect(200)
    ).body as Values;
    expect(total).toBe(3);
    expect(
      observations.map((o) => [
        o.territory.code,
        o.status,
        o.value,
        o.sourceRow,
      ]),
    ).toEqual([
      ['01001', 'documented', '3.3', 2],
      ['2A004', 'not_documented', null, 3],
      ['97101', 'confidential', null, 4],
    ]);
  });

  it('les valeurs se filtrent par territoire et par période', async () => {
    await preprinted('2024', '3,3');
    const one = (
      await visitor()
        .get(
          `/api/public/indicators/${CODE}/observations?level=commune&territory=97101&period=2024`,
        )
        .expect(200)
    ).body as Values;
    expect(one.observations.map((o) => o.territory.name)).toEqual([
      'Les Abymes',
    ]);
    const none = (
      await visitor()
        .get(`/api/public/indicators/${CODE}/observations?period=2019`)
        .expect(200)
    ).body as Values;
    expect(none.total).toBe(0);
    await visitor()
      .get(`/api/public/indicators/${CODE}/observations?level=canton`)
      .expect(400);
  });

  it('une fois relue, la version se lit « publiée », avec le nom de qui l’a relue', async () => {
    const versionId = await preprinted('2024', '3,3');
    await reviewer
      .post(`/api/admin/versions/${versionId}/approve`)
      .send({})
      .expect(200);
    const sheet = (
      await visitor().get(`/api/public/indicators/${CODE}`).expect(200)
    ).body as Sheet;
    expect(sheet.provenance[0]).toMatchObject({
      status: 'published',
      statusLabel: 'Publiée : relue par une autre personne que son auteur',
      version: { authoredBy: 'Compte admin', reviewedBy: 'Compte reviewer' },
    });
  });

  it('les millésimes se lisent ensemble, l’évolution reste visible ; une version remplacée ne se lit plus', async () => {
    await preprinted('2023', '3,1');
    await preprinted('2024', '3,2');
    await preprinted('2024', '3,3');
    const { observations, provenance } = (
      await visitor()
        .get(`/api/public/indicators/${CODE}/observations?territory=01001`)
        .expect(200)
    ).body as Values;
    expect(provenance.map((p) => p.version.vintage)).toEqual(['2024', '2023']);
    expect(observations.map((o) => [o.period, o.value, o.vintage])).toEqual([
      ['2023', '3.1', '2023'],
      ['2024', '3.3', '2024'],
    ]);
    const [line] = (await visitor().get('/api/public/indicators').expect(200))
      .body as Line[];
    expect(line).toMatchObject({ vintage: '2024', vintages: ['2024', '2023'] });
  });

  it('aucune adresse de courriel ne sort par l’API publique', async () => {
    await preprinted('2024', '3,3');
    const pages = await Promise.all(
      ['', `/${CODE}`, `/${CODE}/observations`].map((path) =>
        visitor().get(`/api/public/indicators${path}`).expect(200),
      ),
    );
    for (const page of pages)
      expect(JSON.stringify(page.body)).not.toMatch(/@/);
  });

  it('une commune cliquée donne toutes ses couches publiées, chacune avec ses périodes', async () => {
    await preprinted('2023', '3,1');
    await preprinted('2024', '3,3');
    await validatedVersion(founder, datasetId, '2025', '9,9');
    const { territory, layers } = (
      await visitor()
        .get('/api/public/territories/commune/01001/values')
        .expect(200)
    ).body as {
      territory: { name: string };
      layers: {
        indicator: { code: string; producer: string };
        values: { period: string; value: string }[];
      }[];
    };
    expect(territory.name).toBe("L'Abergement-Clémenciat");
    expect(layers).toHaveLength(1);
    expect(layers[0].indicator).toMatchObject({
      code: CODE,
      producer: 'DREES',
    });
    expect(layers[0].values.map((v) => [v.period, v.value])).toEqual([
      ['2023', '3.1'],
      ['2024', '3.3'],
    ]);
    await visitor()
      .get('/api/public/territories/commune/99999/values')
      .expect(404);
  });
});
