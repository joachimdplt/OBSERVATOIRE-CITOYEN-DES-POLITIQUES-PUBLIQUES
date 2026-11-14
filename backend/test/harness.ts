import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Role } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

export const PASSWORD = 'mot-de-passe-de-test';

/** Le serveur HTTP de l'API, typé pour supertest. */
export const http = (app: INestApplication) => app.getHttpServer() as App;

/**
 * L'API complète, branchée sur la base de test. La limite de connexions par
 * minute est levée par défaut : chaque test se reconnecte, et la limite est
 * vérifiée par son propre test.
 */
export async function startApi({
  throttled = false,
  providers = [],
}: {
  throttled?: boolean;
  /** Des ports remplacés pour le test : une source du Parlement sans réseau. */
  providers?: { provide: symbol | string; useValue: unknown }[];
} = {}) {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (!throttled)
    builder.overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true });
  for (const p of providers)
    builder.overrideProvider(p.provide).useValue(p.useValue);
  const moduleRef = await builder.compile();
  const app = setupApp(moduleRef.createNestApplication());
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Vide toutes les tables, dans l'ordre que les triggers acceptent. */
export async function emptyDatabase(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  // TRUNCATE ne déclenche pas les triggers ligne à ligne : c'est la seule
  // façon de remettre à zéro une base qui refuse les suppressions.
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`,
  );
}

export async function createMember(
  prisma: PrismaService,
  role: Role,
  email = `${role}@observatoire.test`,
) {
  return prisma.user.create({
    data: {
      email,
      name: `Compte ${role}`,
      role,
      passwordHash: await argon2.hash(PASSWORD),
    },
  });
}

/** Un agent HTTP qui garde le cookie de session, connecté sous ce compte. */
export async function signedIn(app: INestApplication, email: string) {
  const agent = request.agent(http(app));
  await agent
    .post('/api/admin/session')
    .send({ email, password: PASSWORD })
    .expect(200);
  return agent;
}
