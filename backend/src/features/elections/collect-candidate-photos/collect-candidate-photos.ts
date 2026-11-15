import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PHOTO_SOURCE, type PhotoSource } from '../../../ports/photo-source';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Les photos des candidats : pour chacun dont l'équipe a vérifié l'élément
 * Wikidata, la photo principale sous licence libre, avec son auteur, sa
 * licence et sa page sur Commons. Un candidat sans photo libre n'en a pas :
 * aucune photo de presse ni de campagne n'est reprise.
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class CollectCandidatePhotosController {
  constructor(
    private prisma: PrismaService,
    @Inject(PHOTO_SOURCE) private photos: PhotoSource,
  ) {}

  @Post('candidate-photos')
  @HttpCode(200)
  collect() {
    return collectCandidatePhotos(this.prisma, this.photos);
  }
}

/** Le geste du collecteur, appelé par l'administration ou en ligne de commande. */
export async function collectCandidatePhotos(
  prisma: PrismaService,
  photos: PhotoSource,
) {
  const candidates = await prisma.candidate.findMany({
    where: { wikidataId: { not: null } },
  });
  const report = {
    candidates: 0,
    photos: 0,
    without: [] as string[],
    failed: [] as string[],
  };
  for (const c of candidates) {
    report.candidates++;
    let photo;
    try {
      photo = await photos.photoOf(c.wikidataId!);
    } catch (e) {
      report.failed.push(`${c.name} : ${String(e)}`);
      continue;
    }
    if (photo) report.photos++;
    else report.without.push(c.name);
    await prisma.candidate.update({
      where: { id: c.id },
      data: {
        photoUrl: photo?.url ?? null,
        photoAuthor: photo?.author ?? null,
        photoLicence: photo?.licence ?? null,
        photoLicenceUrl: photo?.licenceUrl ?? null,
        photoPage: photo?.page ?? null,
        photoCheckedAt: new Date(),
      },
    });
  }
  return report;
}
