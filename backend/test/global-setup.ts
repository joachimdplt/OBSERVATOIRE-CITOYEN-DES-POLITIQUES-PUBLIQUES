import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Client } from 'pg';

/**
 * Avant toute suite : la base de test repart de zéro, migrations comprises.
 *
 * Elle est vidée en SQL puis migrée par `prisma migrate deploy`. Par
 * sécurité, rien ne se passe si le nom de la base ne finit pas par `_test` :
 * une variable mal recopiée ne doit jamais effacer la base de développement.
 */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL manquant');
  const database = new URL(url).pathname.slice(1);
  if (!database.endsWith('_test')) {
    throw new Error(
      `Base « ${database} » refusée : une base de test finit par _test.`,
    );
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(
    'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;',
  );
  await client.end();

  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
}
