import {
  BadRequestException,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { DecisionMode, LabelStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Une personne retire un rangement automatique faux. Le rangement reste en
 * base, marqué retiré, avec qui l'a retiré et quand ; il ne s'affiche plus.
 */
@Controller('admin/subjects/labels')
@UseGuards(SessionGuard)
@Requires('edit')
export class RemoveCapLabelController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/remove')
  @HttpCode(200)
  async remove(@Param('id') id: string, @CurrentUser() user: TeamMember) {
    const label = await this.prisma.capLabel.findUnique({ where: { id } });
    if (!label) throw new NotFoundException('Rangement inconnu');
    if (label.status === LabelStatus.rejected)
      throw new BadRequestException('Ce rangement est déjà retiré.');
    await this.prisma.capLabel.update({
      where: { id },
      data: {
        status: LabelStatus.rejected,
        decidedById: user.id,
        decidedAt: new Date(),
        decisionMode: DecisionMode.person,
      },
    });
    return { id, removed: true };
  }
}
