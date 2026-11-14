import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { can, type Capability } from '../domain/roles';
import { PrismaService } from '../prisma/prisma.service';
import type { TeamMember } from './current-user.decorator';
import { SESSION_COOKIE, SessionToken } from './session-token';

const CAPABILITY = 'capability';

/** La capacité qu'exige une route d'administration. */
export const Requires = (capability: Capability) =>
  SetMetadata(CAPABILITY, capability);

/**
 * La garde de toute route d'administration. Le compte est relu en base à
 * chaque requête : un compte retiré perd l'accès tout de suite, sans attendre
 * l'expiration de son jeton.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private token: SessionToken,
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: TeamMember }>();
    const userId = this.token.read(
      (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE],
    );
    if (!userId) throw new UnauthorizedException('Session absente ou expirée');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Session absente ou expirée');
    }

    const required = this.reflector.getAllAndOverride<Capability | undefined>(
      CAPABILITY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (required && !can(user.role, required)) {
      throw new ForbiddenException('Ce compte ne peut pas faire ce geste');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return true;
  }
}
