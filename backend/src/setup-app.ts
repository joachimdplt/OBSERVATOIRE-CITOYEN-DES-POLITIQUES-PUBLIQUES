import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';

/**
 * Le réglage commun à l'API lancée et à l'API des tests : les tests de bout
 * en bout passent par les mêmes préfixe, cookies et validations.
 *
 * L'API publique se lit depuis n'importe quel site : elle ne demande ni
 * compte ni cookie, et ne sert qu'à lire. L'administration n'ouvre aucune
 * origine : elle partage la sienne avec l'API.
 */
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use(openPublicReading);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  return app;
}

/** Ouvre la lecture de /api/public à toute origine, sans cookie ni écriture. */
function openPublicReading(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/public/') && req.path !== '/api/public')
    return next();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}
