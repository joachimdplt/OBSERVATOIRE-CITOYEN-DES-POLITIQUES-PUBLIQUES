import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { SessionGuard } from '../../../auth/session.guard';

/** L'administration demande qui est connecté, au chargement de chaque écran. */
@Controller('admin/session')
export class GetSessionController {
  @Get()
  @UseGuards(SessionGuard)
  get(@CurrentUser() user: TeamMember) {
    return user;
  }
}
