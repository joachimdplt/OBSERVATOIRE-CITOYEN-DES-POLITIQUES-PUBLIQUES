import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
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
    PublicModule,
  ],
})
export class AppModule {}
