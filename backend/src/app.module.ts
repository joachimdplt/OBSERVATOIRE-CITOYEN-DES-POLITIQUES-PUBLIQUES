import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CatalogueModule } from './features/catalogue/catalogue.module';
import { ImportsModule } from './features/imports/imports.module';
import { ElectionsModule } from './features/elections/elections.module';
import { ProgrammesModule } from './features/programmes/programmes.module';
import { VideosModule } from './features/videos/videos.module';
import { ApiKeysModule } from './features/api-keys/api-keys.module';
import { JobsModule } from './jobs/jobs.module';
import { CampaignModule } from './features/campaign/campaign.module';
import { SubjectsModule } from './features/subjects/subjects.module';
import { LiveModule } from './features/live/live.module';
import { PoliticsModule } from './features/politics/politics.module';
import { PublicationsModule } from './features/publications/publications.module';
import { ReviewsModule } from './features/reviews/reviews.module';
import configuration from './config/configuration';
import { SessionModule } from './features/session/session.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './features/public/public.module';
import { PublicCacheInterceptor } from './common/public-cache.interceptor';

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
    LiveModule,
    ElectionsModule,
    ProgrammesModule,
    VideosModule,
    ApiKeysModule,
    JobsModule,
    CampaignModule,
    SubjectsModule,
    PublicModule,
  ],
  // Les réponses publiques se resservent pendant cinq minutes.
  providers: [{ provide: APP_INTERCEPTOR, useClass: PublicCacheInterceptor }],
})
export class AppModule {}
