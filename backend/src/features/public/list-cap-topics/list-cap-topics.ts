import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/** La citation demandée par le Comparative Agendas Project. */
const CITATION =
  'Jones, Bryan D., Frank R. Baumgartner, Sean M. Theriault, Derek A. Epp, Shruti Khandekar, Daniel Little. 2025. Policy Agendas Project: Codebook.';

/**
 * La grille des sujets : les grands sujets du Comparative Agendas Project et
 * leurs sous-sujets, en français (traduction de l'équipe) et en anglais
 * (intitulé officiel), avec la source, la version et la licence.
 */
@Controller('public/cap-topics')
export class ListCapTopicsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const all = await this.prisma.capTopic.findMany();
    const byCode = (a: { code: string }, b: { code: string }) =>
      Number(a.code) - Number(b.code);
    const first = all.at(0);
    return {
      source: first?.source ?? null,
      version: first?.version ?? null,
      importedAt: first?.importedAt.toISOString() ?? null,
      licence: 'CC BY-NC-SA 4.0',
      citation: CITATION,
      translation:
        'Intitulés français : traduction de l’équipe de l’observatoire. Définitions françaises : traduction automatique, non relue ; la définition officielle en anglais fait foi.',
      topics: all
        .filter((t) => t.level === 1)
        .sort(byCode)
        .map((t) => ({
          code: t.code,
          label: t.labelFr,
          title: t.title,
          subtopics: all
            .filter((s) => s.majorCode === t.code)
            .sort(byCode)
            .map((s) => ({
              code: s.code,
              label: s.labelFr,
              title: s.title,
              description: s.description,
              // La définition en français, et qui l'a traduite : une
              // traduction d'assistant non relue se dit comme telle.
              descriptionFr: s.descriptionFr,
              translatedBy: s.descriptionFrBy,
            })),
        })),
    };
  }
}
