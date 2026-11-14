import {
  Body,
  ConflictException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { ProviderKind } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { isUniqueViolation } from '../../../prisma/unique-violation';

export class CreateProviderDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() acronym!: string;
  @IsEnum(ProviderKind) kind!: ProviderKind;
  @IsUrl({ protocols: ['https'], require_protocol: true }) officialUrl!: string;
}

/** L'équipe déclare un producteur de statistiques publiques : DREES, DEPP, INSEE… */
@Controller('admin/providers')
@UseGuards(SessionGuard)
@Requires('edit')
export class CreateProviderController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(
    @CurrentUser() user: TeamMember,
    @Body() dto: CreateProviderDto,
  ) {
    try {
      return await this.prisma.dataProvider.create({
        data: {
          name: dto.name.trim(),
          acronym: dto.acronym.trim(),
          kind: dto.kind,
          officialUrl: dto.officialUrl,
          createdById: user.id,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `Le producteur ${dto.acronym} est déjà déclaré.`,
        );
      }
      throw err;
    }
  }
}
