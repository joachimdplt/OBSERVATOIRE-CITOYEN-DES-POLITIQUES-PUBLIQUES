import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Un visiteur voit où en sont les candidats d'une élection : chacun avec son
 * parti, la source de sa déclaration et l'état de son programme à la date de
 * vérification. Ordre alphabétique, même présentation pour tous.
 */
@Controller('public/elections')
export class GetElectionController {
  constructor(private prisma: PrismaService) {}

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const election = await this.prisma.election.findUnique({
      where: { slug },
      include: { candidates: true },
    });
    if (!election) throw new NotFoundException('Élection inconnue');
    const surname = (name: string) =>
      name.split(' ').slice(1).join(' ') || name;
    return {
      slug: election.slug,
      name: election.name,
      date: election.date?.toISOString().slice(0, 10) ?? null,
      criterion: election.criterion,
      candidates: election.candidates
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          party: c.party,
          declaredAt: c.declaredAt.toISOString().slice(0, 10),
          declarationSource: c.declarationSource,
          programmeStatus: c.programmeStatus,
          programmeUrl: c.programmeUrl,
          programmeNote: c.programmeNote,
          programmeCheckedAt:
            c.programmeCheckedAt?.toISOString().slice(0, 10) ?? null,
          photo: c.photoUrl
            ? {
                url: c.photoUrl,
                author: c.photoAuthor,
                licence: c.photoLicence,
                licenceUrl: c.photoLicenceUrl,
                page: c.photoPage,
              }
            : null,
        }))
        .sort((a, b) => surname(a.name).localeCompare(surname(b.name), 'fr')),
    };
  }
}
