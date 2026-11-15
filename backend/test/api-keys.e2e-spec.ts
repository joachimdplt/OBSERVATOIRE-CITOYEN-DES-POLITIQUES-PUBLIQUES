import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { Role } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createMember,
  emptyDatabase,
  http,
  reader,
  signedIn,
  startApi,
} from './harness';

describe('l’API publique se lit avec une clé', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestAgent;
  let editor: TestAgent;
  const URL = '/api/public/indicators';

  beforeAll(async () => {
    ({ app, prisma } = await startApi());
    await emptyDatabase(prisma);
    await createMember(prisma, Role.admin, 'joachim@observatoire.test');
    await createMember(prisma, Role.editor, 'eve@observatoire.test');
    admin = await signedIn(app, 'joachim@observatoire.test');
    editor = await signedIn(app, 'eve@observatoire.test');
  });
  afterAll(() => app?.close());
  const anonymous = () => request(http(app));

  it('sans clé, ou avec une clé inventée, rien ne sort', async () => {
    await anonymous().get(URL).expect(401);
    await anonymous().get(URL).set('X-Api-Key', 'obs_inventee').expect(401);
  });

  it('le site lit avec sa clé', async () => {
    await reader(app).get(URL).expect(200);
  });

  it('l’administration donne une clé, qui ne s’affiche qu’une fois, et la retire', async () => {
    await editor.post('/api/admin/api-keys').send({ label: 'x' }).expect(403);
    const created = await admin
      .post('/api/admin/api-keys')
      .send({ label: 'Une chercheuse, pour une thèse' })
      .expect(201);
    const { id, key } = created.body as { id: string; key: string };
    expect(key).toMatch(/^obs_/);

    await anonymous().get(URL).set('X-Api-Key', key).expect(200);
    const list = (await admin.get('/api/admin/api-keys').expect(200))
      .body as Record<string, unknown>[];
    expect(list).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain(key);
    expect(list[0].lastUsedAt).not.toBeNull();

    await admin.post(`/api/admin/api-keys/${id}/revoke`).expect(200);
    await anonymous().get(URL).set('X-Api-Key', key).expect(401);
  });

  it('la demande préalable d’un navigateur passe sans clé', async () => {
    const res = await anonymous().options(URL).expect(204);
    expect(res.headers['access-control-allow-headers']).toBe('X-Api-Key');
  });
});
