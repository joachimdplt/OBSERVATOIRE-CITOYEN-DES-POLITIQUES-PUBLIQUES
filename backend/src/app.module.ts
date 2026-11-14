import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CatalogueModule } from './features/catalogue/catalogue.module';
import { ImportsModule } from './features/imports/imports.module';
import { PoliticsModule } from './features/politics/politics.module';
import { PublicationsModule } from './features/publications/publications.module';
import { ReviewsModule } from './features/reviews/reviews.module';
import configuration from './config/configuration';
import { SessionModule } from './features/session/session.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './features/public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    SessionModule,
    CatalogueModule,
    ImportsModule,
    ReviewsModule,
    PublicationsModule,
    PoliticsModule,
    PublicModule,
  ],
})
export class AppModule {}
