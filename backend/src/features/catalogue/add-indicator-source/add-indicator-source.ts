import {
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { isUniqueViolation } from '../../../prisma/unique-violation';

export class AddIndicatorSourceDto {
  @IsUUID() datasetId!: string;
}

/**
 * L'équipe relie un indicateur à un jeu de plus : le zonage des médecins est
 * un indicateur national, alimenté par l'arrêté de chaque ARS. La définition,
 * l'unité et la liste de catégories restent celles de l'indicateur ; chaque
 * jeu garde sa provenance, sa licence et ses versions.
 */
@Controller('admin/indicators')
@UseGuards(SessionGuard)
@Requires('edit')
export class AddIndicatorSourceController {
  constructor(private prisma: PrismaService) {}

  @Post(':code/sources')
  async add(
    @CurrentUser() user: TeamMember,
    @Param('code') code: string,
    @Body() dto: AddIndicatorSourceDto,
  ) {
    const indicator = await this.prisma.indicatorDefinition.findUnique({
      where: { code },
    });
    if (!indicator) throw new NotFoundException('Indicateur inconnu');
    const dataset = await this.prisma.sourceDataset.findUnique({
      where: { id: dto.datasetId },
      include: { provider: true },
    });
    if (!dataset) throw new NotFoundException('Jeu de données inconnu');

    try {
      return await this.prisma.indicatorSource.create({
        data: {
          indicatorId: indicator.id,
          datasetId: dataset.id,
          createdById: user.id,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `${dataset.provider.acronym} · « ${dataset.title} » alimente déjà cet indicateur.`,
        );
      }
      throw err;
    }
  }
}
