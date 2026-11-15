/** La configuration lue une fois, au démarrage. Sans secret, l'API refuse de partir. */
export default () => {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error(
      'SESSION_SECRET manquant : la session ne peut pas être signée.',
    );
  }
  return {
    port: Number(process.env.PORT ?? 3001),
    production: process.env.NODE_ENV === 'production',
    sessionSecret,
    sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 8),
    storageDir: process.env.STORAGE_DIR ?? './storage',
    /** La clé du site public, qui lit l'API côté serveur. */
    siteApiKey: process.env.SITE_API_KEY ?? '',
  };
};
