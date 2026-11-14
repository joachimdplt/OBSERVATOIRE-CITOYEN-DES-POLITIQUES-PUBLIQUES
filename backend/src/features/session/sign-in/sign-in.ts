import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import * as argon2 from 'argon2';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Response } from 'express';
import { SESSION_COOKIE, SessionToken } from '../../../auth/session-token';
import { PrismaService } from '../../../prisma/prisma.service';

export class SignInDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
}

/**
 * Empreinte d'un mot de passe que personne ne connaît : vérifiée quand
 * l'adresse n'existe pas, pour que la réponse prenne le même temps et ne
 * révèle pas quels comptes existent.
 */
const DECOY_HASH = argon2.hash('aucun-compte-ne-porte-ce-mot-de-passe');

/** Une personne de l'équipe ouvre sa session d'administration. */
@Controller('admin/session')
export class SignInController {
  constructor(
    private prisma: PrismaService,
    private token: SessionToken,
  ) {}

  @Post()
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    const valid = user
      ? await argon2.verify(user.passwordHash, dto.password)
      : (await argon2.verify(await DECOY_HASH, dto.password)) && false;

    // Même message pour une adresse inconnue, un mot de passe faux ou un
    // compte retiré.
    if (!user || !valid || !user.active) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    res.cookie(
      SESSION_COOKIE,
      this.token.issue(user.id),
      this.token.cookieOptions(),
    );
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
