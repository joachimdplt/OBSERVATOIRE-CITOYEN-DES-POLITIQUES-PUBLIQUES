import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { readPublicationSlug } from '../../../domain/publication-content';
import { topicsOf } from '../../../domain/programme';
import { DocumentKind, Pillar } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

export class SaveTopicDto {
  @IsString() @IsNotEmpty() slug!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(Pillar) pillar!: Pillar;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) terms!: string[];
}

/**
 * L'équipe nomme un enjeu et écrit les termes qui le reconnaissent. Les
 * passages de tous les programmes déjà collectés sont relus avec ces
 * termes : un terme retiré retire ses rattachements, un terme ajouté en crée.
 * Le nom suit la règle des articles : il nomme, il ne pose pas de question.
 */
@Controller('admin/topics')
@UseGuards(SessionGuard)
@Requires('preprint')
export class SaveTopicController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async save(@CurrentUser() user: TeamMember, @Body() dto: SaveTopicDto) {
    const read = readPublicationSlug(dto.slug);
    if (!read.valid) throw new BadRequestException(read.reason);
    const { slug } = read;
    const name = dto.name.trim();
    if (name.endsWith('?'))
      throw new BadRequestException(
        'Un enjeu se nomme ; il ne se pose pas en question.',
      );
    const terms = [...new Set(dto.terms.map((t) => t.trim()).filter(Boolean))];
    const topic = await this.prisma.topic.upsert({
      where: { slug },
      update: { name, pillar: dto.pillar, terms },
      create: { slug, name, pillar: dto.pillar, terms, createdById: user.id },
    });
    const passages = await this.prisma.measure.findMany({
      where: { document: { kind: DocumentKind.programme } },
      select: { id: true, quote: true },
    });
    const matches = passages.flatMap((m) =>
      topicsOf(m.quote, [{ slug, terms }]).map((t) => ({
        topicId: topic.id,
        measureId: m.id,
        term: t.term,
      })),
    );
    await this.prisma.$transaction([
      this.prisma.topicMatch.deleteMany({ where: { topicId: topic.id } }),
      this.prisma.topicMatch.createMany({ data: matches }),
    ]);
    return { ...topic, matches: matches.length };
  }
}
