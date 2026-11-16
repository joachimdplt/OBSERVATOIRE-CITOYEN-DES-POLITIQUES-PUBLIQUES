import { NO_TOPIC } from '../../../domain/filing-unit';
import { fileCorrection } from '../file-correction';
import { liveProgrammes } from '../../../common/live-programmes';
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
import type { Proposal } from '../../../domain/vote';
import { DecisionMode, LabelStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { inLabel } from '../../../domain/filing-unit';

/** Les passages montrés pour trancher. */
const SHOWN = 4;

/**
 * La relecture des rangements sur lesquels les méthodes ne sont pas
 * d'accord : une personne choisit le sujet (une des propositions ou un
 * autre), ou dit que le texte n'en a pas, et écrit pourquoi en une phrase.
 * Sa décision est signée ; elle sert d'exemple au modèle pour la suite.
 */
@Controller('admin/subjects')
@UseGuards(SessionGuard)
@Requires('edit')
export class ReviewCapLabelsController {
  constructor(private prisma: PrismaService) {}

  @Get('review')
  async list() {
    const topics = (
      await this.prisma.capTopic.findMany({ where: { level: 1 } })
    ).sort((a, b) => Number(a.code) - Number(b.code));
    const labelOf = new Map(topics.map((t) => [t.code, t.labelFr]));
    labelOf.set(NO_TOPIC, 'Aucun sujet de politique publique');
    const labels = await this.prisma.capLabel.findMany({
      where: { status: LabelStatus.review },
      include: { candidate: { select: { name: true } } },
    });
    const documents = await liveProgrammes(this.prisma, {
      where: { url: { in: [...new Set(labels.map((l) => l.documentUrl))] } },
      select: {
        id: true,
        url: true,
        title: true,
      },
    });
    const live = new Map(documents.map((d) => [d.url, d]));
    const measures = await this.prisma.measure.findMany({
      where: {
        documentId: { in: [...live.values()].map((d) => d.id) },
        article: { in: [...new Set(labels.map((l) => l.heading))] },
      },
      select: {
        documentId: true,
        article: true,
        quote: true,
        page: true,
        position: true,
      },
      orderBy: { position: 'asc' },
    });
    const items = labels.flatMap((l) => {
      const d = live.get(l.documentUrl);
      if (!d) return [];
      const passages = measures
        .filter(
          (m) =>
            m.documentId === d.id &&
            m.article === l.heading &&
            inLabel(l, m.position),
        )
        .slice(0, SHOWN)
        .map((m) => ({ quote: m.quote, page: m.page }));
      const proposals = ((l.proposals ?? []) as Proposal[]).map((p) => ({
        method: p.method,
        code: p.code,
        label: p.code ? (labelOf.get(p.code) ?? p.code) : null,
      }));
      return [
        {
          id: l.id,
          candidate: l.candidate.name,
          heading: l.heading,
          document: { title: d.title, url: d.url },
          passages,
          proposals,
          // Plus les méthodes divergent, plus le cas est ambigu : il passe
          // en premier, c'est là qu'une décision apprend le plus.
          spread: new Set(proposals.map((p) => p.code)).size,
        },
      ];
    });
    items.sort((a, b) => b.spread - a.spread);
    return {
      total: items.length,
      topics: topics.map((t) => ({ code: t.code, label: t.labelFr })),
      items,
    };
  }

  @Post('labels/:id/decide')
  @HttpCode(200)
  async decide(
    @Param('id') id: string,
    @Body() body: { code?: string | null; reason?: string },
    @CurrentUser() user: TeamMember,
  ) {
    const reason = body.reason?.trim() ?? '';
    if (reason.length < 3)
      throw new BadRequestException(
        'Écrivez pourquoi en une phrase : elle servira d’exemple au modèle.',
      );
    const label = await this.prisma.capLabel.findUnique({ where: { id } });
    if (!label) throw new NotFoundException('Rangement inconnu');
    if (label.status !== LabelStatus.review)
      throw new BadRequestException('Ce rangement n’attend pas de relecture.');
    const code = body.code ?? null;
    if (
      code &&
      !(await this.prisma.capTopic.findFirst({ where: { code, level: 1 } }))
    )
      throw new BadRequestException('Sujet inconnu');
    const signed = {
      decidedById: user.id,
      decidedAt: new Date(),
      decisionMode: DecisionMode.person,
      reason,
    };

    await this.prisma.$transaction(async (tx) => {
      // Le bon sujet est celui du modèle : le rangement est confirmé.
      if (code === label.capCode) {
        await tx.capLabel.update({
          where: { id },
          data: { status: LabelStatus.validated, ...signed },
        });
        return;
      }
      // Sinon il est retiré, et le bon sujet est rangé au nom de la personne.
      await tx.capLabel.update({
        where: { id },
        data: { status: LabelStatus.rejected, ...signed },
      });
      if (!code) return;
      await fileCorrection(tx, label, code, signed);
    });
    return { id, code, decided: true };
  }
}
