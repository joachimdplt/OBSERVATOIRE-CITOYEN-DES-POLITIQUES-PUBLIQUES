import {
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNotEmpty, IsString, IsUrl, IsUUID } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { Frequency } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { isUniqueViolation } from '../../../prisma/unique-violation';

export class CreateDatasetDto {
  @IsUUID() providerId!: string;
  /** L'identifiant du jeu chez son producteur, tel quel. */
  @IsString() @IsNotEmpty() producerRef!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsUrl({ protocols: ['https'], require_protocol: true }) url!: string;
  @IsString() @IsNotEmpty() license!: string;
  @IsString() @IsNotEmpty() methodology!: string;
  @IsEnum(Frequency) frequency!: Frequency;
}

/**
 * L'équipe déclare un jeu de données publié par un producteur, avec sa
 * licence de réutilisation et sa méthodologie. Sans licence ni méthode, un jeu
 * ne se déclare pas : ce sont les deux premières questions du protocole de
 * collecte.
 */
@Controller('admin/datasets')
@UseGuards(SessionGuard)
@Requires('edit')
export class CreateDatasetController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(@CurrentUser() user: TeamMember, @Body() dto: CreateDatasetDto) {
    const provider = await this.prisma.dataProvider.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException('Producteur inconnu');

    try {
      return await this.prisma.sourceDataset.create({
        data: {
          providerId: provider.id,
          producerRef: dto.producerRef.trim(),
          title: dto.title.trim(),
          url: dto.url,
          license: dto.license.trim(),
          methodology: dto.methodology.trim(),
          frequency: dto.frequency,
          createdById: user.id,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `Le jeu ${dto.producerRef} de ${provider.acronym} est déjà déclaré.`,
        );
      }
      throw err;
    }
  }
}
