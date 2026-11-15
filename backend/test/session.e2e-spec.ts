import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  PASSWORD,
  createMember,
  emptyDatabase,
  http,
  reader,
  signedIn,
  startApi,
} from './harness';

describe('une personne de l’équipe se connecte à l’administration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
  });
  beforeEach(async () => {
    await emptyDatabase(prisma);
    await createMember(prisma, Role.editor);
  });
  afterAll(() => app?.close());

  it('ouvre sa session et se voit connectée', async () => {
    const agent = await signedIn(app, 'editor@observatoire.test');
    const me = await agent.get('/api/admin/session').expect(200);
    expect(me.body).toMatchObject({
      email: 'editor@observatoire.test',
      role: 'editor',
    });
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('le cookie de session est inaccessible au navigateur et réservé à l’administration', async () => {
    const res = await reader(app)
      .post('/api/admin/session')
      .send({ email: 'editor@observatoire.test', password: PASSWORD })
      .expect(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/admin/);
  });

  it('un mot de passe faux et une adresse inconnue reçoivent la même réponse', async () => {
    const wrong = await reader(app)
      .post('/api/admin/session')
      .send({ email: 'editor@observatoire.test', password: 'faux' })
      .expect(401);
    const unknown = await reader(app)
      .post('/api/admin/session')
      .send({ email: 'personne@observatoire.test', password: 'faux' })
      .expect(401);
    const message = (res: { body: unknown }) =>
      (res.body as { message: string }).message;
    expect(message(wrong)).toBe(message(unknown));
  });

  it('sans session, l’administration ne répond pas', async () => {
    await reader(app).get('/api/admin/session').expect(401);
  });

  it('un compte retiré perd l’accès tout de suite, même avec une session ouverte', async () => {
    const agent = await signedIn(app, 'editor@observatoire.test');
    await prisma.user.update({
      where: { email: 'editor@observatoire.test' },
      data: { active: false },
    });
    await agent.get('/api/admin/session').expect(401);
  });

  it('fermer la session efface le cookie', async () => {
    const agent = await signedIn(app, 'editor@observatoire.test');
    await agent.delete('/api/admin/session').expect(204);
    await agent.get('/api/admin/session').expect(401);
  });

  it('au-delà de dix essais par minute, la connexion est refusée', async () => {
    const throttledApp = (await startApi({ throttled: true })).app;
    const attempt = () =>
      request(http(throttledApp))
        .post('/api/admin/session')
        .send({ email: 'editor@observatoire.test', password: 'faux' });
    for (let i = 0; i < 10; i++) await attempt().expect(401);
    await attempt().expect(429);
    await throttledApp.close();
  });
});
