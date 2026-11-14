import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { Pillar } from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

class LiveValueDto {
  @IsString() @IsNotEmpty() column!: string;
  @IsString() @IsNotEmpty() unit!: string;
}

class LiveLayoutDto {
  @IsString() @IsNotEmpty() territoryColumn!: string;
  @IsString() @IsNotEmpty() periodColumn!: string;
  @IsString() @IsNotEmpty() labelColumn!: string;
  @IsOptional() @IsString() unitColumn?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LiveValueDto)
  values!: LiveValueDto[];
  @IsOptional() @IsObject() secret?: { column: string; marker: string };
}

export class CreateLiveSourceDto {
  @IsString() @IsNotEmpty() slug!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() producer!: string;
  @IsEnum(Pillar) pillar!: Pillar;
  @IsUrl({ protocols: ['https'], require_protocol: true }) datasetUrl!: string;
  @IsString() @IsNotEmpty() resourceId!: string;
  @IsString() @IsNotEmpty() license!: string;
  @ValidateNested() @Type(() => LiveLayoutDto) layout!: LiveLayoutDto;
}

/**
 * L'équipe enregistre une source lue à la demande et la façon de la lire :
 * les colonnes du territoire, de la période, du libellé et des valeurs, et
 * la marque du secret statistique. L'outil la rejoue à chaque lecture.
 */
@Controller('admin/live-sources')
@UseGuards(SessionGuard)
@Requires('preprint')
export class CreateLiveSourceController {
  constructor(private prisma: PrismaService) {}

  @Post()
  create(@Body() dto: CreateLiveSourceDto) {
    return this.prisma.liveSource.create({
      data: {
        ...dto,
        layout: dto.layout as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
