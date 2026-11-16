import { execFile } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  ConflictException,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';

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

const report = () =>
  resolve(backendDir(), '..', 'tools', 'measure', 'data', 'rapport.html');

/**
 * Le rapport de mesure de l'outil Python (tools/measure), dans l'admin.
 * Recalculer lance la même commande que `npm run measure` : l'export des
 * verdicts de personnes, puis les mesures et les graphiques.
 */
@Controller('admin/subjects/measure')
@UseGuards(SessionGuard)
@Requires('edit')
export class MeasureReportController {
  private running = false;

  @Get()
  read() {
    const path = report();
    if (!existsSync(path)) return { html: null, generatedAt: null };
    return {
      html: readFileSync(path, 'utf8'),
      generatedAt: statSync(path).mtime,
    };
  }

  @Post()
  @HttpCode(200)
  async run() {
    if (this.running)
      throw new ConflictException('Une mesure est déjà en cours.');
    this.running = true;
    try {
      await new Promise<void>((done, fail) =>
        execFile(
          'npm',
          ['run', 'measure', '--', '--no-open'],
          { cwd: backendDir(), timeout: 5 * 60 * 1000 },
          (error, _out, err) =>
            error ? fail(new Error(err || error.message)) : done(),
        ),
      );
    } catch (e) {
      throw new InternalServerErrorException(
        `La mesure a échoué : ${(e as Error).message.slice(-400)}`,
      );
    } finally {
      this.running = false;
    }
    return this.read();
  }
}
