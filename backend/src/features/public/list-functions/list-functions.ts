import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * La nomenclature des sujets : les 10 fonctions de l'action publique et leurs
 * sous-fonctions (COFOG), avec la source de la liste.
 */
@Controller('public/functions')
export class ListFunctionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const all = await this.prisma.cofogFunction.findMany({
      orderBy: { code: 'asc' },
    });
    return {
      source: all[0]?.source ?? null,
      importedAt: all[0]?.importedAt.toISOString() ?? null,
      functions: all
        .filter((f) => f.level === 1)
        .map((f) => ({
          code: f.display,
          label: f.label,
          children: all
            .filter((c) => c.parentCode === f.code)
            .map((c) => ({ code: c.display, label: c.label })),
        })),
    };
  }
}
