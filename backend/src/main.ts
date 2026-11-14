import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = setupApp(await NestFactory.create(AppModule));
  const port = app.get(ConfigService).getOrThrow<number>('port');
  await app.listen(port);
  console.log(`API sur http://localhost:${port}/api`);
}
void bootstrap();
