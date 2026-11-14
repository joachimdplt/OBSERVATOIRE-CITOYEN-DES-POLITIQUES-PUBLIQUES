import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsString } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import {
  checkPublicationText,
  readPublicationSlug,
} from '../../../domain/publication-content';
import { Pillar } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { isUniqueViolation } from '../../../prisma/unique-violation';

export class CreatePublicationDto {
  @IsString() slug!: string;
  @IsEnum(Pillar) pillar!: Pillar;
  @IsString() title!: string;
  @IsString() summary!: string;
}

/**
 * L'équipe ouvre une publication sur un enjeu : son adresse publique, son
 * pilier, son titre et son chapô. Elle naît avec un premier brouillon, où
 * s'écrivent ensuite ses maillons.
 */
@Controller('admin/publications')
@UseGuards(SessionGuard)
@Requires('edit')
export class CreatePublicationController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(
    @CurrentUser() user: TeamMember,
    @Body() dto: CreatePublicationDto,
  ) {
    const slug = readPublicationSlug(dto.slug);
    const errors = [
      ...(slug.valid ? [] : [slug.reason]),
      ...checkPublicationText(dto),
    ];
    if (errors.length > 0 || !slug.valid) throw new BadRequestException(errors);
    try {
      return await this.prisma.publication.create({
        data: {
          slug: slug.slug,
          pillar: dto.pillar,
          createdById: user.id,
          versions: {
            create: {
              number: 1,
              title: dto.title.trim(),
              summary: dto.summary.trim(),
              createdById: user.id,
            },
          },
        },
        include: { versions: true },
      });
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException(`L’adresse « ${slug.slug} » est prise.`);
      throw err;
    }
  }
}
