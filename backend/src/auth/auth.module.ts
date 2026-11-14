import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SessionGuard } from './session.guard';
import { SessionToken } from './session-token';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [SessionToken, SessionGuard],
  exports: [SessionToken, SessionGuard],
})
export class AuthModule {}
