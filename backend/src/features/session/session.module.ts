import { Module } from '@nestjs/common';
import { GetSessionController } from './get-session/get-session';
import { SignInController } from './sign-in/sign-in';
import { SignOutController } from './sign-out/sign-out';

/** La session de l'équipe : ouvrir, consulter, fermer. */
@Module({
  controllers: [SignInController, GetSessionController, SignOutController],
})
export class SessionModule {}
