import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { ChannelKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

export class AddVideoChannelDto {
  @Matches(/^UC[\w-]{22}$/, {
    message: 'Identifiant de chaîne YouTube attendu : UC suivi de 22 signes.',
  })
  youtubeId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(ChannelKind) kind!: ChannelKind;
  /** Le candidat de la chaîne, ou celui que le parti présente : « presidentielle-2027/jean-luc-melenchon ». */
  @IsOptional() @IsString() candidate?: string;
  /** La page officielle qui donne le lien vers la chaîne. */
  @IsUrl({ protocols: ['https'], require_protocol: true }) linkedFrom!: string;
}

/**
 * L'équipe ajoute une chaîne vidéo à suivre : celle d'un candidat, de son
 * parti ou d'une institution, avec la page officielle qui la cite. Seules les
 * sources primaires entrent : le candidat parle, sans montage ni commentaire
 * d'un tiers.
 */
@Controller('admin/video-channels')
@UseGuards(SessionGuard)
@Requires('preprint')
export class AddVideoChannelController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async add(@CurrentUser() user: TeamMember, @Body() dto: AddVideoChannelDto) {
    // Une chaîne de candidat ou de parti nomme son candidat ; une
    // institution n'en nomme aucun.
    if ((dto.kind !== ChannelKind.institution) !== Boolean(dto.candidate))
      throw new BadRequestException(
        'Une chaîne de candidat ou de parti nomme son candidat ; une institution n’en nomme aucun.',
      );
    let candidateId: string | null = null;
    if (dto.candidate) {
      const [election, slug] = dto.candidate.split('/');
      const candidate = await this.prisma.candidate.findFirst({
        where: { slug, election: { slug: election } },
      });
      if (!candidate) throw new NotFoundException('Candidat inconnu');
      candidateId = candidate.id;
    }
    const data = {
      name: dto.name.trim(),
      kind: dto.kind,
      candidateId,
      linkedFrom: dto.linkedFrom,
    };
    return this.prisma.videoChannel.upsert({
      where: { youtubeId: dto.youtubeId },
      update: data,
      create: { ...data, youtubeId: dto.youtubeId, createdById: user.id },
    });
  }
}
