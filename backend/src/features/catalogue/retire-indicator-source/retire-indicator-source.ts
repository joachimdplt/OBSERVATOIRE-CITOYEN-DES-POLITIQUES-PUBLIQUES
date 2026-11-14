import {
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

export class RetireIndicatorSourceDto {
  @IsString() @MinLength(10) @MaxLength(2000) reason!: string;
}

/**
 * L'équipe retire un jeu des sources d'un indicateur : le zonage passe de
 * l'arrêté de chaque ARS au fichier national, par exemple. Rien ne s'efface :
 * le lien reste, avec qui l'a retiré, quand et pourquoi, et la fiche publique
 * de l'indicateur le montre. Les versions du jeu restent lisibles dans son
 * historique ; elles ne nourrissent plus cet indicateur.
 */
@Controller('admin/indicators')
@UseGuards(SessionGuard)
@Requires('edit')
export class RetireIndicatorSourceController {
  constructor(private prisma: PrismaService) {}

  @Post(':code/sources/:datasetId/retire')
  @HttpCode(200)
  async retire(
    @CurrentUser() user: TeamMember,
    @Param('code') code: string,
    @Param('datasetId', ParseUUIDPipe) datasetId: string,
    @Body() dto: RetireIndicatorSourceDto,
  ) {
    const source = await this.prisma.indicatorSource.findFirst({
      where: { indicator: { code }, datasetId, retiredAt: null },
    });
    if (!source)
      throw new NotFoundException('Ce jeu n’alimente pas cet indicateur.');
    return this.prisma.indicatorSource.update({
      where: { id: source.id },
      data: {
        retiredAt: new Date(),
        retiredById: user.id,
        retiredReason: dto.reason.trim(),
      },
    });
  }
}
