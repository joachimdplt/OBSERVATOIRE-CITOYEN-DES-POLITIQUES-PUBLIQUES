import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { currentCaptures } from '../../../domain/programme';
import { rateOf, sampleSize } from '../../../domain/sampling';
import {
  CheckVerdict,
  DecisionMode,
  DocumentKind,
  LabelOrigin,
  LabelStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/** Les passages montrés sur une carte : ceux que le rangement a lus. */
const SHOWN = 8;

/** L'ordre de tirage : au hasard, mais le même à chaque visite. */
const drawOrder = (id: string) =>
  createHash('sha1').update(`verification:${id}`).digest('hex');

type Population = {
  id: string;
  candidateId: string;
  status: LabelStatus;
  verdict: CheckVerdict | null;
};

/**
 * Les cartes de vérification : une personne dit, rangement par rangement,
 * si le sujet donné par la machine est juste. C'est la seule voie qui
 * enregistre une décision de personne sur un rangement automatique ; elle
 * fournit la référence qui mesure la fiabilité, candidat par candidat.
 *
 * La population d'un candidat : ses rangements affichés, plus ceux qu'une
 * carte a déjà refusés, pour que le taux ne change pas de base en cours de
 * route.
 */
@Controller('admin/subjects/checks')
@UseGuards(SessionGuard)
@Requires('edit')
export class CheckCapLabelsController {
  constructor(private prisma: PrismaService) {}

  private async population(candidateId?: string): Promise<Population[]> {
    const labels = await this.prisma.capLabel.findMany({
      where: {
        ...(candidateId ? { candidateId } : {}),
        OR: [
          {
            status: { in: [LabelStatus.proposed, LabelStatus.validated] },
            // Un rangement créé par une personne en reclassant n'est pas un
            // rangement de la machine : il n'entre pas dans la mesure.
            NOT: {
              origin: LabelOrigin.person,
              decisionMode: DecisionMode.person,
              checks: { none: {} },
            },
          },
          { checks: { some: {} } },
        ],
      },
      select: {
        id: true,
        candidateId: true,
        status: true,
        checks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
          select: { verdict: true },
        },
      },
    });
    return labels.map((l) => ({
      id: l.id,
      candidateId: l.candidateId,
      status: l.status,
      verdict: l.checks[0]?.verdict ?? null,
    }));
  }

  private progress(labels: Population[]) {
    const checked = labels.filter((l) => l.verdict !== null);
    const accepted = checked.filter(
      (l) => l.verdict === CheckVerdict.accepted,
    ).length;
    return {
      population: labels.length,
      target: sampleSize(labels.length),
      checked: checked.length,
      accepted,
      refused: checked.length - accepted,
      // Les refus pas encore rangés ailleurs ni écartés.
      toReclass: checked.filter((l) => l.verdict === CheckVerdict.refused)
        .length,
      rate: rateOf(accepted, checked.length, labels.length),
    };
  }

  @Get()
  async candidates() {
    const [candidates, labels] = await Promise.all([
      this.prisma.candidate.findMany({ select: { id: true, name: true } }),
      this.population(),
    ]);
    return candidates
      .map((c) => ({
        id: c.id,
        name: c.name,
        ...this.progress(labels.filter((l) => l.candidateId === c.id)),
      }))
      .filter((c) => c.population > 0)
      .sort((a, b) => a.population - b.population);
  }

  /** La grille entière, pour le panneau des sujets : chaque grand sujet et
   * ses sous-sujets, qui en tiennent lieu de définition. */
  @Get('topics')
  async topics() {
    const all = await this.prisma.capTopic.findMany({
      select: {
        code: true,
        level: true,
        majorCode: true,
        labelFr: true,
        description: true,
        descriptionFr: true,
        descriptionFrBy: true,
      },
    });
    const byCode = (a: { code: string }, b: { code: string }) =>
      Number(a.code) - Number(b.code);
    return all
      .filter((t) => t.level === 1)
      .sort(byCode)
      .map((t) => ({
        code: t.code,
        label: t.labelFr,
        subtopics: all
          .filter((s) => s.level === 2 && s.majorCode === t.code)
          .sort(byCode)
          .map((s) => ({
            code: s.code,
            label: s.labelFr,
            definition: s.descriptionFr,
            translatedBy: s.descriptionFrBy,
            official: s.description,
          })),
      }));
  }

  @Get(':candidateId/next')
  async next(@Param('candidateId') candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, name: true },
    });
    if (!candidate) throw new NotFoundException('Candidat inconnu');
    const labels = await this.population(candidateId);
    const progress = this.progress(labels);
    const order = labels
      .filter((l) => l.verdict === null)
      .map((l) => ({ id: l.id, key: drawOrder(l.id) }))
      .sort((a, b) => a.key.localeCompare(b.key));

    // Le premier rangement dont le texte se lit encore ; un document retiré
    // depuis ne fait pas de carte.
    for (const { id } of order) {
      const card = await this.card(id);
      if (card) return { candidate, progress, card };
    }
    return { candidate, progress, card: null };
  }

  private async card(id: string) {
    const label = await this.prisma.capLabel.findUniqueOrThrow({
      where: { id },
      include: { topic: true },
    });
    const documents = await this.prisma.politicalDocument.findMany({
      where: {
        kind: DocumentKind.programme,
        sourceRef: { not: null },
        retiredAt: null,
        url: label.documentUrl,
      },
      select: {
        id: true,
        url: true,
        title: true,
        sourceRef: true,
        fetchedAt: true,
        createdAt: true,
      },
    });
    const current = currentCaptures(
      documents.map((d) => ({
        id: d.id,
        sourceRef: d.sourceRef!,
        fetchedAt: d.fetchedAt ?? d.createdAt,
      })),
    );
    const document = documents.find((d) => current.has(d.id));
    if (!document) return null;
    const passages = await this.prisma.measure.findMany({
      where: {
        documentId: document.id,
        article: label.heading,
        position: { gte: label.fromPosition ?? 0 },
      },
      orderBy: { position: 'asc' },
      take: SHOWN,
      select: { quote: true, page: true },
    });
    if (passages.length === 0) return null;
    const subtopics = await this.prisma.capTopic.findMany({
      where: { majorCode: label.capCode, level: 2 },
      orderBy: { code: 'asc' },
      select: { labelFr: true },
    });
    return {
      id: label.id,
      heading: label.heading,
      document: {
        title: document.title,
        url: document.url,
        fetchedAt: document.fetchedAt ?? document.createdAt,
      },
      passages,
      topic: {
        code: label.capCode,
        label: label.topic.labelFr,
        subtopics: subtopics.map((t) => t.labelFr),
      },
    };
  }

  /** Le prochain refus à reclasser pour un candidat. */
  @Get(':candidateId/reclass/next')
  async nextReclass(@Param('candidateId') candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, name: true },
    });
    if (!candidate) throw new NotFoundException('Candidat inconnu');
    const refused = (await this.population(candidateId))
      .filter((l) => l.verdict === CheckVerdict.refused)
      .map((l) => ({ id: l.id, key: drawOrder(l.id) }))
      .sort((a, b) => a.key.localeCompare(b.key));
    for (const { id } of refused) {
      const card = await this.card(id);
      if (card) return { candidate, left: refused.length, card };
    }
    return { candidate, left: refused.length, card: null };
  }

  /**
   * Après un refus, la personne range le chapitre dans le bon sujet, ou dit
   * que le texte n'est pas une position du candidat. Le rangement refusé
   * reste retiré ; le bon sujet devient un rangement de personne, affiché.
   */
  @Post('reclass')
  @HttpCode(200)
  async reclass(
    @Body() body: { labelId?: string; code?: string | null },
    @CurrentUser() user: TeamMember,
  ) {
    const label = await this.prisma.capLabel.findUnique({
      where: { id: body.labelId ?? '' },
      include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 } },
    });
    if (!label) throw new NotFoundException('Rangement inconnu');
    if (label.checks[0]?.verdict !== CheckVerdict.refused)
      throw new BadRequestException(
        'Ce rangement n’attend pas de reclassement.',
      );
    const code = body.code ?? null;
    if (code === label.capCode)
      throw new BadRequestException(
        'C’est le sujet refusé : choisissez-en un autre.',
      );
    if (
      code &&
      !(await this.prisma.capTopic.findFirst({ where: { code, level: 1 } }))
    )
      throw new BadRequestException('Sujet inconnu');
    const signed = {
      status: LabelStatus.validated,
      decisionMode: DecisionMode.person,
      decidedById: user.id,
      decidedAt: new Date(),
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.labelCheck.create({
        data: {
          labelId: label.id,
          verdict: code ? CheckVerdict.corrected : CheckVerdict.dismissed,
          correctedCode: code,
          checkedById: user.id,
        },
      });
      if (!code) return;
      const key = {
        candidateId: label.candidateId,
        documentUrl: label.documentUrl,
        heading: label.heading,
        capCode: code,
      };
      await tx.capLabel.upsert({
        where: { candidateId_documentUrl_heading_capCode: key },
        create: {
          ...key,
          fromPosition: label.fromPosition,
          origin: LabelOrigin.person,
          ...signed,
        },
        update: signed,
      });
    });
    return { id: label.id, code };
  }

  @Post()
  @HttpCode(200)
  async check(
    @Body() body: { labelId?: string; verdict?: string },
    @CurrentUser() user: TeamMember,
  ) {
    const verdict = body.verdict;
    if (verdict !== CheckVerdict.accepted && verdict !== CheckVerdict.refused)
      throw new BadRequestException('Verdict attendu : valider ou refuser.');
    const label = await this.prisma.capLabel.findUnique({
      where: { id: body.labelId ?? '' },
    });
    if (!label) throw new NotFoundException('Rangement inconnu');
    if (label.status === LabelStatus.review)
      throw new BadRequestException(
        'Ce rangement attend une relecture : il ne se vérifie pas par carte.',
      );
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.labelCheck.create({
        data: { labelId: label.id, verdict, checkedById: user.id },
      }),
      // Le verdict décide de l'affichage : validé, il reste ; refusé, il
      // disparaît du site en attendant d'être rangé ailleurs.
      this.prisma.capLabel.update({
        where: { id: label.id },
        data: {
          status:
            verdict === CheckVerdict.accepted
              ? LabelStatus.validated
              : LabelStatus.rejected,
          decisionMode: DecisionMode.person,
          decidedById: user.id,
          decidedAt: now,
        },
      }),
    ]);
    return { id: label.id, verdict };
  }
}
