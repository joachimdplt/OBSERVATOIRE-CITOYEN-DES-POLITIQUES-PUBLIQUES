import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { topicsOf } from '../../../domain/programme';
import { DocumentKind, Origin } from '../../../generated/prisma/enums';
import {
  PROGRAMME_READER,
  type ProgrammeReader,
} from '../../../ports/programme-reader';
import { PrismaService } from '../../../prisma/prisma.service';
import { RawFileStore } from '../../../storage/raw-file-store';

/** Une table des matières ne mène pas à plus de pages que cela. */
const MAX_PAGES = 80;

/**
 * Le collecteur des programmes : pour chaque adresse indiquée par l'équipe,
 * il lit la page ou le fichier (et, pour une table des matières, chaque page
 * qu'elle annonce), garde le fichier tel que reçu sous son empreinte, et
 * découpe le texte en passages cités mot pour mot. Chaque passage est
 * rattaché aux enjeux dont il porte un terme.
 *
 * Un contenu déjà lu ne se recollecte pas ; un contenu changé entre comme un
 * nouveau document, l'ancien reste. Rien n'est réécrit ni libellé par la
 * machine : « collecté automatiquement, non relu ».
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class CollectProgrammesController {
  constructor(
    private prisma: PrismaService,
    private store: RawFileStore,
    @Inject(PROGRAMME_READER) private reader: ProgrammeReader,
  ) {}

  @Post('programmes')
  @HttpCode(200)
  collect(@CurrentUser() user: TeamMember) {
    return collectProgrammes(
      this.prisma,
      this.reader,
      (bytes) => this.store.keep(bytes),
      user.id,
    );
  }
}

/** Le geste du collecteur, appelé par l'administration ou par la tâche planifiée. */
export async function collectProgrammes(
  prisma: PrismaService,
  reader: ProgrammeReader,
  keep: (bytes: Buffer) => Promise<string>,
  actorId: string,
) {
  const sources = await prisma.programmeSource.findMany({
    include: { candidate: true },
  });
  const topics = await prisma.topic.findMany({
    select: { id: true, slug: true, terms: true },
  });
  const report = {
    pages: 0,
    unchanged: 0,
    collected: 0,
    passages: 0,
    matches: 0,
    failed: [] as string[],
  };

  for (const source of sources) {
    let urls = [source.url];
    if (source.follow) {
      try {
        const pattern = new RegExp(source.follow);
        const entry = await reader.read(source.url);
        urls = entry.links.filter((l) => pattern.test(l)).slice(0, MAX_PAGES);
      } catch (e) {
        report.failed.push(`${source.url} : ${String(e)}`);
        continue;
      }
    }
    for (const url of urls) {
      report.pages++;
      let file;
      try {
        file = await reader.read(url);
      } catch (e) {
        report.failed.push(`${url} : ${String(e)}`);
        continue;
      }
      // L'empreinte du texte lu, pas du fichier : une page web change à
      // chaque visite (jetons, horodatages) sans que son texte change.
      const content = createHash('sha256')
        .update(
          file.passages
            .map((p) => `${p.page ? `${p.page}\n` : ''}${p.heading}\n${p.text}`)
            .join('\n\n'),
        )
        .digest('hex');
      const sourceRef = `${url}#${content.slice(0, 16)}`;
      if (await prisma.politicalDocument.findUnique({ where: { sourceRef } })) {
        report.unchanged++;
        continue;
      }
      const fileHash = await keep(file.bytes);
      const now = new Date();
      const document = await prisma.politicalDocument.create({
        data: {
          kind: DocumentKind.programme,
          title: file.title,
          filedAt: now,
          url: file.url,
          firstAuthor: source.candidate.name,
          origin: Origin.automatic,
          sourceRef,
          candidateId: source.candidateId,
          programmeSourceId: source.id,
          fileHash,
          fetchedAt: now,
          createdById: actorId,
          measures: {
            create: file.passages.map((p, position) => ({
              position,
              page: p.page ?? null,
              article: p.heading || file.title,
              quote: p.text,
              origin: Origin.automatic,
              createdById: actorId,
            })),
          },
        },
        include: { measures: { select: { id: true, quote: true } } },
      });
      report.collected++;
      report.passages += document.measures.length;
      const matches = document.measures.flatMap((m) =>
        topicsOf(m.quote, topics).map((t) => ({
          topicId: topics.find((x) => x.slug === t.slug)!.id,
          measureId: m.id,
          term: t.term,
        })),
      );
      await prisma.topicMatch.createMany({
        data: matches,
        skipDuplicates: true,
      });
      report.matches += matches.length;
    }
  }
  return report;
}
