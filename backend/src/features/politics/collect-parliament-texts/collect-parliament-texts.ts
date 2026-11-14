import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { groupAt, readArticles, watchMatch } from '../../../domain/parliament';
import { Origin } from '../../../generated/prisma/enums';
import {
  PARLIAMENT_SOURCE,
  type ParliamentSource,
} from '../../../ports/parliament-source';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Le collecteur : il lit les données ouvertes du Parlement et garde, pour
 * chaque publication, les textes déposés dont le titre porte un terme
 * surveillé. Chaque texte entre avec son premier signataire, le groupe de
 * celui-ci au jour du dépôt, et chaque article cité mot pour mot. Il
 * s'affiche aussitôt, « collecté automatiquement, non relu » ; aucun libellé
 * n'est écrit par la machine.
 *
 * Un texte ne se collecte qu'une fois (sa référence est unique) ; relancer le
 * collecteur ne fait qu'ajouter les nouveaux dépôts.
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class CollectParliamentTextsController {
  constructor(
    private prisma: PrismaService,
    @Inject(PARLIAMENT_SOURCE) private source: ParliamentSource,
  ) {}

  @Post('parliament')
  @HttpCode(200)
  collect(@CurrentUser() user: TeamMember) {
    return collectParliamentTexts(this.prisma, this.source, user.id);
  }
}

/** Le geste du collecteur, appelé par l'administration ou par la tâche quotidienne. */
export async function collectParliamentTexts(
  prisma: PrismaService,
  source: ParliamentSource,
  actorId: string,
) {
  const publications = await prisma.publication.findMany({
    where: { watchTerms: { isEmpty: false } },
    select: { id: true, slug: true, watchTerms: true },
  });
  const report = { examined: 0, matched: 0, collected: 0, articles: 0 };
  // Un terme retiré de la veille retire ses rattachements ; le texte reste.
  for (const p of publications)
    await prisma.documentMatch.deleteMany({
      where: { publicationId: p.id, term: { notIn: p.watchTerms } },
    });
  if (publications.length === 0) return report;

  const texts = await source.listTexts();
  report.examined = texts.length;
  let members: Awaited<ReturnType<ParliamentSource['members']>> | null = null;

  for (const text of texts) {
    const hits = publications
      .map((p) => ({ p, term: watchMatch(text.title, p.watchTerms) }))
      .filter((h): h is { p: (typeof publications)[number]; term: string } =>
        Boolean(h.term),
      );
    if (hits.length === 0) continue;
    report.matched++;

    // Déjà là : collecté, ou saisi par l'équipe sous le même numéro.
    let document = await prisma.politicalDocument.findFirst({
      where: {
        OR: [
          { sourceRef: text.sourceRef },
          { chamber: text.chamber, number: text.number, kind: text.kind },
        ],
      },
    });
    if (!document) {
      members ??= await source.members();
      const author = text.firstAuthorRef
        ? members.get(text.firstAuthorRef)
        : undefined;
      // Une proposition dont l'auteur n'est pas député vient du Sénat : elle
      // se collecte avec son vrai auteur par la source du Sénat, pas ici.
      if (text.kind === 'bill' && !author) {
        report.matched--;
        continue;
      }
      const group = author ? groupAt(author.groups, text.filedAt) : null;
      const articles = readArticles(await source.fetchText(text.textUrl));
      document = await prisma.politicalDocument.create({
        data: {
          kind: text.kind,
          title: text.title,
          number: text.number,
          chamber: text.chamber,
          filedAt: new Date(text.filedAt),
          url: text.url,
          firstAuthor: author?.name ?? 'Gouvernement',
          authorGroup: group,
          authorGroupSource: group ? source.groupsSource : null,
          origin: Origin.automatic,
          sourceRef: text.sourceRef,
          createdById: actorId,
          measures: {
            create: articles.map((a) => ({
              article: a.article,
              quote: a.text,
              origin: Origin.automatic,
              createdById: actorId,
            })),
          },
        },
      });
      report.collected++;
      report.articles += articles.length;
    }
    for (const { p, term } of hits) {
      await prisma.documentMatch.upsert({
        where: {
          publicationId_documentId: {
            publicationId: p.id,
            documentId: document.id,
          },
        },
        update: {},
        create: { publicationId: p.id, documentId: document.id, term },
      });
    }
  }
  return report;
}
