import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/**
 * Le réglage commun à l'API lancée et à l'API des tests : les tests de bout
 * en bout passent par les mêmes préfixe, cookies et validations.
 *
 * Pas de CORS : l'administration et l'API partagent une origine, et le site
 * public appelle l'API côté serveur.
 */
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  return app;
}
