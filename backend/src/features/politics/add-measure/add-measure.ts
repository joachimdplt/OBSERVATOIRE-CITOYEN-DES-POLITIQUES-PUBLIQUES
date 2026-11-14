import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { checkMeasure } from '../../../domain/measure';
import { PrismaService } from '../../../prisma/prisma.service';

export class AddMeasureDto {
  @IsString() article!: string;
  @IsString() quote!: string;
  @IsString() label!: string;
}

/**
 * L'équipe tire une mesure d'un texte : l'article, la citation mot pour mot,
 * et un libellé qui reformule sans qualifier. La citation ne se réécrit
 * jamais ensuite ; une erreur se corrige par une nouvelle mesure.
 */
@Controller('admin/political-documents')
@UseGuards(SessionGuard)
@Requires('edit')
export class AddMeasureController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/measures')
  async add(
    @CurrentUser() user: TeamMember,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMeasureDto,
  ) {
    const document = await this.prisma.politicalDocument.findUnique({
      where: { id },
    });
    if (!document) throw new NotFoundException('Texte inconnu');
    const errors = checkMeasure(dto);
    if (errors.length > 0) throw new BadRequestException(errors);
    return this.prisma.measure.create({
      data: {
        documentId: id,
        article: dto.article.trim(),
        quote: dto.quote.trim(),
        label: dto.label.trim(),
        createdById: user.id,
      },
    });
  }
}
