import {
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

/** Une clé retirée ne lit plus rien, aussitôt. Le retrait est daté et reste. */
@Controller('admin/api-keys')
@UseGuards(SessionGuard)
@Requires('manage_accounts')
export class RevokeApiKeyController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/revoke')
  @HttpCode(200)
  async revoke(@Param('id') id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('Clé inconnue');
    if (key.revokedAt) return key;
    return this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: { id: true, label: true, prefix: true, revokedAt: true },
    });
  }
}
