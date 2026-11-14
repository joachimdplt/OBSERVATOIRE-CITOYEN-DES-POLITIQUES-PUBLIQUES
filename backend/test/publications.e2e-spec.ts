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

type Created = { id: string; versions: { id: string }[] };
type Public = {
  title: string;
  status: string;
  authoredBy: string;
  reviewedBy: string | null;
  sections: {
    title: string;
    indicators: { code: string; justification: string }[];
  }[];
  history: { number: number; status: string }[];
};

const DRAFT = {
  title: 'Accès aux médecins généralistes',
  summary:
    'Les médecins généralistes, leur répartition et leur âge, par commune et par département.',
  sections: [
    {
      title: 'S’installer',
      text: 'Où les généralistes exercent, au regard des besoins de soins de la population.',
      indicators: [
        {
          code: 'apl-medecins-generalistes',
          justification:
            'La DREES mesure par commune l’accès aux généralistes.',
        },
      ],
    },
  ],
};

describe('une publication : un enjeu lu maillon par maillon, relu avant d’être publié', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: TestAgent;
  let reviewer: TestAgent;
  let datasetId: string;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
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

  it('un titre nomme l’enjeu ; une question est refusée', async () => {
    await founder
      .post('/api/admin/publications')
      .send({
        slug: 'medecins',
        pillar: 'health',
        title: 'Est-ce facile de voir un médecin ?',
        summary: 'x',
      })
      .expect(400);
  });

  it('se crée, s’écrit, ne se prépublie qu’entière et sur des données vérifiées, puis se relit', async () => {
    const created = (
      await founder
        .post('/api/admin/publications')
        .send({
          slug: 'acces-aux-medecins',
          pillar: 'health',
          title: DRAFT.title,
          summary: DRAFT.summary,
        })
        .expect(201)
    ).body as Created;
    const draftId = created.versions[0].id;
    const preprint = () =>
      founder.post(`/api/admin/publication-versions/${draftId}/preprint`);

    // Sans maillon, rien à publier.
    await preprint().expect(400);
    await founder
      .put(`/api/admin/publication-versions/${draftId}`)
      .send(DRAFT)
      .expect(200);
    // L'indicateur n'a pas encore de données vérifiées.
    await preprint().expect(400);
    await visitor()
      .get('/api/public/publications/acces-aux-medecins')
      .expect(404);

    const { versionId } = await validatedVersion(
      founder,
      datasetId,
      '2024',
      '3,3',
    );
    await founder.post(`/api/admin/versions/${versionId}/preprint`).expect(200);
    await preprint().expect(200);

    // Hors brouillon, la base refuse de réécrire un maillon.
    await expect(
      prisma.publicationSection.updateMany({
        where: { versionId: draftId },
        data: { title: 'Autre' },
      }),
    ).rejects.toThrow();
    await founder
      .put(`/api/admin/publication-versions/${draftId}`)
      .send(DRAFT)
      .expect(409);

    let page = (
      await visitor()
        .get('/api/public/publications/acces-aux-medecins')
        .expect(200)
    ).body as Public;
    expect(page).toMatchObject({
      title: DRAFT.title,
      status: 'preprint',
      authoredBy: 'Compte admin',
      reviewedBy: null,
    });
    expect(page.sections[0].indicators[0]).toMatchObject({
      code: 'apl-medecins-generalistes',
      justification: DRAFT.sections[0].indicators[0].justification,
    });

    // L'auteur ne se relit pas lui-même ; une autre personne, si.
    await founder
      .post(`/api/admin/publication-versions/${draftId}/approve`)
      .send({})
      .expect(403);
    await reviewer
      .post(`/api/admin/publication-versions/${draftId}/approve`)
      .send({})
      .expect(200);
    page = (
      await visitor()
        .get('/api/public/publications/acces-aux-medecins')
        .expect(200)
    ).body as Public;
    expect(page).toMatchObject({
      status: 'published',
      reviewedBy: 'Compte reviewer',
    });
  });

  it('une correction est une nouvelle version ; l’ancienne reste citée', async () => {
    const draft = (
      await founder
        .post('/api/admin/publications/acces-aux-medecins/drafts')
        .expect(201)
    ).body as { id: string; number: number };
    expect(draft.number).toBe(2);
    await founder
      .post('/api/admin/publications/acces-aux-medecins/drafts')
      .expect(409);
    await founder
      .put(`/api/admin/publication-versions/${draft.id}`)
      .send({ ...DRAFT, summary: `${DRAFT.summary} Mise à jour.` })
      .expect(200);
    await founder
      .post(`/api/admin/publication-versions/${draft.id}/preprint`)
      .expect(200);
    const page = (
      await visitor()
        .get('/api/public/publications/acces-aux-medecins')
        .expect(200)
    ).body as Public;
    expect(page.status).toBe('preprint');
    expect(page.history).toEqual([
      expect.objectContaining({ number: 1, status: 'superseded' }),
    ]);
    const list = (await visitor().get('/api/public/publications').expect(200))
      .body as { slug: string }[];
    expect(list.map((p) => p.slug)).toEqual(['acces-aux-medecins']);
  });

  it('une mesure se cite mot pour mot, se rattache à un maillon, et sa citation ne se réécrit pas', async () => {
    const document = (
      await founder
        .post('/api/admin/political-documents')
        .send({
          kind: 'bill',
          title:
            'Proposition de loi visant à lutter contre les déserts médicaux, d’initiative transpartisane',
          number: '966',
          chamber: 'national_assembly',
          filedAt: '2025-02-13',
          url: 'https://www.assemblee-nationale.fr/dyn/17/textes/l17b0966_proposition-loi.pdf',
          firstAuthor: 'Guillaume Garot',
        })
        .expect(201)
    ).body as { id: string };
    await founder
      .post('/api/admin/political-documents')
      .send({
        kind: 'bill',
        title: 'x',
        filedAt: '2025-02-13',
        url: 'https://www.assemblee-nationale.fr/x.pdf',
        firstAuthor: 'X',
        authorGroup: 'Un groupe sans source',
      })
      .expect(400);
    const add = (label: string) =>
      founder
        .post(`/api/admin/political-documents/${document.id}/measures`)
        .send({
          article: 'Article 1er',
          quote:
            'L’installation d’un médecin exerçant à titre libéral ou salarié est soumise à l’autorisation préalable du directeur général de l’agence régionale de santé compétente',
          label,
        });
    await add('Une promesse irréaliste').expect(400);
    const measure = (
      await add(
        'Soumettre l’installation des médecins à l’autorisation de l’agence régionale de santé',
      ).expect(201)
    ).body as { id: string };
    await expect(
      prisma.measure.update({
        where: { id: measure.id },
        data: { quote: 'Autre citation' },
      }),
    ).rejects.toThrow();

    const draft = (
      await founder
        .post('/api/admin/publications/acces-aux-medecins/drafts')
        .expect(201)
    ).body as { id: string };
    const sections = [
      {
        ...DRAFT.sections[0],
        measures: [
          {
            measureId: measure.id,
            justification:
              'La mesure porte sur le lieu d’installation des médecins.',
          },
        ],
      },
    ];
    await founder
      .put(`/api/admin/publication-versions/${draft.id}`)
      .send({ ...DRAFT, sections })
      .expect(200);
    await founder
      .post(`/api/admin/publication-versions/${draft.id}/preprint`)
      .expect(200);
    const page = (
      await visitor()
        .get('/api/public/publications/acces-aux-medecins')
        .expect(200)
    ).body as {
      sections: {
        measures: {
          quote: string;
          label: string;
          document: { number: string; firstAuthor: string };
        }[];
      }[];
    };
    expect(page.sections[0].measures[0]).toMatchObject({
      label:
        'Soumettre l’installation des médecins à l’autorisation de l’agence régionale de santé',
      document: { number: '966', firstAuthor: 'Guillaume Garot' },
    });
  });
});
