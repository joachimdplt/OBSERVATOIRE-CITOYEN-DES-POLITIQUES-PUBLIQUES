import { Controller, Get, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

/** Les clés données : à qui, depuis quand, dernier usage, retrait. Jamais la clé. */
@Controller('admin/api-keys')
@UseGuards(SessionGuard)
@Requires('manage_accounts')
export class ListApiKeysController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.apiKey.findMany({
      select: {
        id: true,
        label: true,
        prefix: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
