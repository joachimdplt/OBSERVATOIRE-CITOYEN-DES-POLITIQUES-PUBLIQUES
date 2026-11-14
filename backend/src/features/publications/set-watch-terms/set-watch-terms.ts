import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

export class SetWatchTermsDto {
  @IsArray() @IsString({ each: true }) terms!: string[];
}

/**
 * L'équipe dit quels termes le collecteur surveille dans les titres des
 * textes déposés pour une publication : « déserts médicaux », « accès aux
 * soins ». Les mêmes termes valent pour tous les groupes.
 */
@Controller('admin/publications')
@UseGuards(SessionGuard)
@Requires('edit')
export class SetWatchTermsController {
  constructor(private prisma: PrismaService) {}

  @Put(':slug/watch-terms')
  async set(@Param('slug') slug: string, @Body() dto: SetWatchTermsDto) {
    const publication = await this.prisma.publication.findUnique({
      where: { slug },
    });
    if (!publication) throw new NotFoundException('Publication inconnue');
    const terms = [
      ...new Set(dto.terms.map((t) => t.trim()).filter((t) => t.length >= 3)),
    ];
    return this.prisma.publication.update({
      where: { slug },
      data: { watchTerms: terms },
      select: { slug: true, watchTerms: true },
    });
  }
}
