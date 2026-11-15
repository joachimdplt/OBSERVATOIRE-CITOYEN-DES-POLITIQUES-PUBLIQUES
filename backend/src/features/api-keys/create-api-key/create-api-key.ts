import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { apiKeyHash, apiKeyPrefix, newApiKey } from '../../../domain/api-key';
import { PrismaService } from '../../../prisma/prisma.service';

export class CreateApiKeyDto {
  /** À qui la clé est donnée, et pour quel usage. */
  @IsString() @IsNotEmpty() label!: string;
}

/**
 * L'administration donne une clé d'API à un lecteur nommé. La clé ne
 * s'affiche qu'une fois, à sa création : la base n'en garde que l'empreinte.
 */
@Controller('admin/api-keys')
@UseGuards(SessionGuard)
@Requires('manage_accounts')
export class CreateApiKeyController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(@CurrentUser() user: TeamMember, @Body() dto: CreateApiKeyDto) {
    const key = newApiKey();
    const created = await this.prisma.apiKey.create({
      data: {
        label: dto.label.trim(),
        prefix: apiKeyPrefix(key),
        keyHash: apiKeyHash(key),
        createdById: user.id,
      },
    });
    return {
      id: created.id,
      label: created.label,
      prefix: created.prefix,
      key,
    };
  }
}
