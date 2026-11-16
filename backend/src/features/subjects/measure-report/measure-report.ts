import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  ConflictException,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
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
import { PrismaService } from '../../../prisma/prisma.service';

/** Le dossier du backend : celui qui contient `prisma/schema.prisma`. */
function backendDir(): string {
  let dir = __dirname;
  while (!existsSync(join(dir, 'prisma', 'schema.prisma'))) {
    const up = dirname(dir);
    if (up === dir) throw new Error('Dossier du backend introuvable');
    dir = up;
  }
  return dir;
}

const dataFile = (name: string) =>
  resolve(backendDir(), '..', 'tools', 'measure', 'data', name);

/**
 * Le rapport de mesure de l'outil Python (tools/measure), dans l'admin.
 * Recalculer lance la même commande que `npm run measure` : l'export des
 * verdicts de personnes, puis les mesures et les graphiques. Chaque mesure
 * est archivée en base avec ses chiffres clés ; aucune ne s'efface.
 */
@Controller('admin/subjects/measure')
@UseGuards(SessionGuard)
@Requires('edit')
export class MeasureReportController {
  private running = false;

  constructor(private prisma: PrismaService) {}

  /** Les mesures archivées, la plus récente d'abord, sans leur page. */
  @Get()
  async list() {
    return this.prisma.measureReport.findMany({
      orderBy: { measuredAt: 'desc' },
      select: {
        id: true,
        measuredAt: true,
        summary: true,
        createdBy: { select: { name: true } },
      },
    });
  }

  /** Une mesure archivée, avec sa page. */
  @Get(':id')
  async read(@Param('id') id: string) {
    const report = await this.prisma.measureReport.findUnique({
      where: { id },
      select: { id: true, measuredAt: true, summary: true, html: true },
    });
    if (!report) throw new NotFoundException('Mesure inconnue');
    return report;
  }

  /**
   * Mettre à jour, en une fois, la boucle d'amélioration, toujours dans le
   * même ordre :
   * 1. remesurer le seuil du classeur sur vos verdicts (il s'enregistre à
   *    partir de quatre candidats vérifiés) ;
   * 2. comparer un réseau de neurones au classeur, sur les mêmes cartes ;
   * 3. ranger les chapitres nouveaux, avec le seuil ;
   * 4. mesurer et archiver le rapport.
   */
  @Post()
  @HttpCode(200)
  async run(@CurrentUser() user: TeamMember) {
    if (this.running)
      throw new ConflictException('Une mise à jour est déjà en cours.');
    this.running = true;
    const started = Date.now();
    let filing = '';
    try {
      await this.step('La mesure du seuil', 'npx', [
        'tsx',
        'src/scripts/test-vector-classifier.ts',
      ]);
      // Le réseau de neurones, comparé au classeur sur les mêmes cartes.
      await this.step('L’export pour le réseau de neurones', 'npx', [
        'tsx',
        'src/scripts/export-training.ts',
      ]);
      await this.step('La comparaison avec le réseau de neurones', 'uv', [
        'run',
        '../tools/measure/neural.py',
      ]);
      const out = await this.step('Le rangement', 'npx', [
        'tsx',
        'src/scripts/suggest-cap-labels.ts',
      ]);
      filing = out.trim().split('\n').at(-1) ?? '';
      await this.step('Le rapport', 'npm', [
        'run',
        'measure',
        '--',
        '--no-open',
      ]);
    } finally {
      this.running = false;
    }
    const created = await this.prisma.measureReport.create({
      data: {
        html: readFileSync(dataFile('rapport.html'), 'utf8'),
        // La durée de la mise à jour : la suivante s'en sert d'estimation.
        summary: {
          ...(JSON.parse(
            readFileSync(dataFile('resume.json'), 'utf8'),
          ) as object),
          durationMs: Date.now() - started,
        },
        createdById: user.id,
      },
      select: { id: true },
    });
    return { ...(await this.read(created.id)), filing };
  }

  /** Une étape de la mise à jour, en ligne de commande ; sa sortie. */
  private step(name: string, command: string, args: string[]) {
    return new Promise<string>((done, fail) =>
      execFile(
        command,
        args,
        {
          cwd: backendDir(),
          timeout: 15 * 60 * 1000,
          maxBuffer: 32 * 1024 * 1024,
        },
        (error, out, err) =>
          error
            ? fail(
                new InternalServerErrorException(
                  `${name} a échoué : ${(err || error.message).slice(-400)}`,
                ),
              )
            : done(out),
      ),
    );
  }
}
