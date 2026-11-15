import 'dotenv/config';

/**
 * Les tests de bout en bout écrivent dans leur propre base, jamais dans
 * celle de développement.
 */
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL manquant : les tests refusent de toucher à la base de développement.',
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SESSION_SECRET ??= 'secret-de-test';
process.env.STORAGE_DIR = `${__dirname}/../storage-test`;
// La clé du site public : les tests lisent l'API publique comme lui.
process.env.SITE_API_KEY = 'cle-du-site-de-test';
// La collecte quotidienne ne se déclenche pas pendant les tests.
process.env.COLLECTION_SCHEDULE = 'off';
