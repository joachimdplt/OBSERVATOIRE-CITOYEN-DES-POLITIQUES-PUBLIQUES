import { Controller, Delete, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SESSION_COOKIE, SessionToken } from '../../../auth/session-token';

/** Une personne de l'équipe ferme sa session. */
@Controller('admin/session')
export class SignOutController {
  constructor(private token: SessionToken) {}

  @Delete()
  @HttpCode(204)
  signOut(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, this.token.clearOptions());
  }
}
