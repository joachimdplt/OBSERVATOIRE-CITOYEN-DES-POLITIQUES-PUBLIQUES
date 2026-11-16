import { TOOL_ACCOUNT_ID } from '../../../domain/tool-account';
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
const MAX_PAGES = 150;

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
  /** Un seul candidat, par son identifiant (relecture ciblée). */
  candidateId?: string,
) {
  const sources = await prisma.programmeSource.findMany({
    where: candidateId ? { candidateId } : undefined,
    include: { candidate: true },
  });
  const topics = await prisma.topic.findMany({
    select: { id: true, slug: true, terms: true },
  });
  const report = {
    pages: 0,
    unchanged: 0,
    restored: 0,
    empty: 0,
    /** Des documents dont la relecture ne trouve plus de texte. */
    retired: 0,
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
        // La page d'entrée est la table du programme : elle se lit aussi,
        // avant les pages qu'elle mène, sauf si une autre source la lit déjà.
        const own = sources.some(
          (o) =>
            o.id !== source.id &&
            o.candidateId === source.candidateId &&
            o.url === source.url,
        );
        urls = [
          ...(own ? [] : [source.url]),
          ...entry.links
            .filter((l) => pattern.test(l) && l !== source.url)
            .slice(0, MAX_PAGES),
        ];
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
      // Une page sans aucun passage (une table faite de liens) ne dit rien :
      // elle ne devient pas un document. Si elle en était un, lu avec des
      // règles plus anciennes, il est retiré, signé du compte de l'outil.
      if (file.passages.length === 0) {
        report.empty++;
        const { count } = await prisma.politicalDocument.updateMany({
          where: {
            url: file.url,
            candidateId: source.candidateId,
            kind: DocumentKind.programme,
            retiredAt: null,
          },
          data: {
            retiredAt: new Date(),
            retiredById: TOOL_ACCOUNT_ID,
            retiredReason:
              'La relecture n’y trouve plus de texte de programme (une page faite de liens).',
          },
        });
        report.retired += count;
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
      const known = await prisma.politicalDocument.findUnique({
        where: { sourceRef },
        select: { id: true, fetchedAt: true },
      });
      if (known) {
        // Un texte revenu à une version déjà lue : cette version redevient
        // celle en vigueur, à la date de cette lecture.
        const newer = await prisma.politicalDocument.findFirst({
          where: {
            url: file.url,
            candidateId: source.candidateId,
            retiredAt: null,
            fetchedAt: { gt: known.fetchedAt ?? new Date(0) },
          },
          select: { id: true },
        });
        if (newer) {
          await prisma.politicalDocument.update({
            where: { id: known.id },
            data: { fetchedAt: new Date() },
          });
          report.restored++;
        } else report.unchanged++;
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
