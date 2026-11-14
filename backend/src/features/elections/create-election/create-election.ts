import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { readPublicationSlug } from '../../../domain/publication-content';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export class CreateElectionDto {
  @IsString() slug!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  /** Le critère d'entrée publié, le même pour tous les candidats. */
  @IsString() @IsNotEmpty() criterion!: string;
}

/** L'équipe ouvre le suivi d'une élection, avec son critère d'entrée publié. */
@Controller('admin/elections')
@UseGuards(SessionGuard)
@Requires('preprint')
export class CreateElectionController {
  constructor(private prisma: PrismaService) {}

  @Post()
  create(@Body() dto: CreateElectionDto) {
    const slug = readPublicationSlug(dto.slug);
    if (!slug.valid) throw new BadRequestException([slug.reason]);
    return this.prisma.election.create({
      data: {
        slug: slug.slug,
        name: dto.name.trim(),
        date: dto.date ?? null,
        criterion: dto.criterion.trim(),
      },
    });
  }
}
