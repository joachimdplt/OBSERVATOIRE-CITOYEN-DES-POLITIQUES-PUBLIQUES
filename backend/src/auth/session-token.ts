import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions } from 'express';

export const SESSION_COOKIE = 'observatoire_session';

type SessionPayload = { sub: string };

/**
 * Le jeton de session : un cookie httpOnly, sur la même origine que
 * l'administration. Le navigateur ne peut pas le lire, et un autre site ne
 * peut pas l'envoyer (SameSite strict).
 */
@Injectable()
export class SessionToken {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  issue(userId: string): string {
    return this.jwt.sign({ sub: userId } satisfies SessionPayload, {
      secret: this.config.getOrThrow<string>('sessionSecret'),
      expiresIn: `${this.config.getOrThrow<number>('sessionTtlHours')}h`,
    });
  }

  /** L'identifiant du compte, ou null si le jeton est absent, faux ou expiré. */
  read(token: string | undefined): string | null {
    if (!token) return null;
    try {
      const payload = this.jwt.verify<SessionPayload>(token, {
        secret: this.config.getOrThrow<string>('sessionSecret'),
      });
      return payload.sub;
    } catch {
      return null;
    }
  }

  cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get<boolean>('production') ?? false,
      path: '/api/admin',
      maxAge: this.config.getOrThrow<number>('sessionTtlHours') * 3_600_000,
    };
  }

  /** Les mêmes options, sans durée : celles qu'attend l'effacement du cookie. */
  clearOptions(): CookieOptions {
    const options = this.cookieOptions();
    delete options.maxAge;
    return options;
  }
}
