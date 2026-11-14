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

type Created = { id: string; code?: string };
type CatalogueView = {
  acronym: string;
  createdBy: { name: string };
  datasets: {
    title: string;
    indicators: {
      code: string;
      allowedAggregations: string[];
      limits: string;
    }[];
  }[];
}[];

const DREES = {
  name: 'Direction de la recherche, des études, de l’évaluation et des statistiques',
  acronym: 'DREES',
  kind: 'statistical_service',
  officialUrl: 'https://drees.solidarites-sante.gouv.fr',
};

const APL_DATASET = {
  producerRef: '530_l-accessibilite-potentielle-localisee-apl',
  title:
    'Accessibilité potentielle localisée (APL) aux professionnels de santé',
  url: 'https://data.drees.solidarites-sante.gouv.fr/explore/dataset/530_l-accessibilite-potentielle-localisee-apl/',
  license: 'Licence Ouverte v2.0 (Etalab)',
  methodology: 'Méthode concertée version 2, 2015 à 2022 et suivantes.',
  frequency: 'annual',
};

const APL_INDICATOR = {
  code: 'apl-medecins-generalistes',
  label: 'Accessibilité potentielle localisée aux médecins généralistes',
  definition:
    'Nombre de consultations ou visites accessibles par habitant standardisé, compte tenu de l’offre et de la demande des communes environnantes.',
  scope:
    'Médecins généralistes libéraux et en centre de santé, toutes communes.',
  unit: 'consultations ou visites accessibles par habitant standardisé',
  pillar: 'health',
  allowedAggregations: [],
  method: 'Indicateur local calculé par commune ; voir la méthodologie DREES.',
  limits:
    'Indicateur d’accès : il ne donne pas un nombre de médecins manquants.',
};

describe('l’équipe déclare un producteur, un jeu et un indicateur', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let editor: TestAgent;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
  });
  beforeEach(async () => {
    await emptyDatabase(prisma);
    await createMember(prisma, Role.editor);
    editor = await signedIn(app, 'editor@observatoire.test');
  });
  afterAll(() => app?.close());

  const declareChain = async () => {
    const provider = (
      await editor.post('/api/admin/providers').send(DREES).expect(201)
    ).body as Created;
    const dataset = (
      await editor
        .post('/api/admin/datasets')
        .send({ ...APL_DATASET, providerId: provider.id })
        .expect(201)
    ).body as Created;
    return { provider, dataset };
  };

  it('déclare la DREES, le jeu APL et l’indicateur, puis les retrouve dans le catalogue', async () => {
    const { dataset } = await declareChain();
    await editor
      .post('/api/admin/indicators')
      .send({ ...APL_INDICATOR, datasetId: dataset.id })
      .expect(201);

    const catalogue = (await editor.get('/api/admin/catalogue').expect(200))
      .body as CatalogueView;
    expect(catalogue).toHaveLength(1);
    expect(catalogue[0]).toMatchObject({
      acronym: 'DREES',
      createdBy: { name: 'Compte editor' },
    });
    expect(catalogue[0].datasets[0].indicators[0]).toMatchObject({
      code: 'apl-medecins-generalistes',
      allowedAggregations: [],
    });
  });

  it('un jeu sans licence ni méthodologie ne se déclare pas', async () => {
    const { provider } = await declareChain();
    const withoutRights: Partial<typeof APL_DATASET> = { ...APL_DATASET };
    delete withoutRights.license;
    delete withoutRights.methodology;
    await editor
      .post('/api/admin/datasets')
      .send({ ...withoutRights, producerRef: 'autre', providerId: provider.id })
      .expect(400);
  });

  it('un indicateur sans ses limites ne se déclare pas', async () => {
    const { dataset } = await declareChain();
    await editor
      .post('/api/admin/indicators')
      .send({ ...APL_INDICATOR, datasetId: dataset.id, limits: '' })
      .expect(400);
  });

  it('un code qui ne ferait pas une adresse propre est refusé, avec la règle', async () => {
    const { dataset } = await declareChain();
    const res = await editor
      .post('/api/admin/indicators')
      .send({ ...APL_INDICATOR, datasetId: dataset.id, code: 'APL médecins' })
      .expect(400);
    expect((res.body as { message: string }).message).toMatch(/minuscules/);
  });

  it('un code déjà pris, un producteur ou un jeu déjà déclarés sont refusés', async () => {
    const { dataset } = await declareChain();
    const indicator = { ...APL_INDICATOR, datasetId: dataset.id };
    await editor.post('/api/admin/indicators').send(indicator).expect(201);
    await editor.post('/api/admin/indicators').send(indicator).expect(409);
    await editor.post('/api/admin/providers').send(DREES).expect(409);
  });

  it('un jeu se rattache à un producteur existant, un indicateur à un jeu existant', async () => {
    const nowhere = '00000000-0000-4000-8000-000000000000';
    await editor
      .post('/api/admin/datasets')
      .send({ ...APL_DATASET, providerId: nowhere })
      .expect(404);
    await editor
      .post('/api/admin/indicators')
      .send({ ...APL_INDICATOR, datasetId: nowhere })
      .expect(404);
  });

  it('sans session, le catalogue ne s’ouvre pas et rien ne se déclare', async () => {
    await request(http(app)).get('/api/admin/catalogue').expect(401);
    await request(http(app))
      .post('/api/admin/providers')
      .send(DREES)
      .expect(401);
  });
});
