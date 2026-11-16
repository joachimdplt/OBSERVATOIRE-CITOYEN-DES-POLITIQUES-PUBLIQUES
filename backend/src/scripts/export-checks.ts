/**
 * L'export des verdicts pour l'outil de mesure Python (tools/measure).
 *
 * Une ligne par rangement décidé par une personne : son candidat, son
 * chapitre, le sujet de la machine, le verdict, les voix du vote (avec la
 * confiance du classeur quand elle a été gardée) et le vecteur de son bloc,
 * calculé exactement comme au rangement.
 *
 *   npx tsx src/scripts/export-checks.ts            verdicts de personnes
 *   npx tsx src/scripts/export-checks.ts --demo     décisions de l'assistant,
 *     pour essayer l'outil : la mesure est alors circulaire et ne prouve rien.
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadVoteContext } from '../common/subject-vectors';
import { PrismaClient } from '../generated/prisma/client';
import { MIN_PERSON_TRAIN, trainingSource } from '../domain/calibration';
import { TOOL_ACCOUNT_ID } from '../domain/tool-account';
import {
  CheckVerdict,
  DecisionMode,
  LabelOrigin,
  LabelStatus,
} from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';

const OUT = resolve(__dirname, '../../../tools/measure/data/checks.json');

async function main() {
  const demo = process.argv.includes('--demo');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const ctx = await loadVoteContext(prisma as unknown as PrismaService);
  const labels = await prisma.capLabel.findMany({
    where: {
      decisionMode: demo ? DecisionMode.assistant : DecisionMode.person,
      status: { in: [LabelStatus.validated, LabelStatus.rejected] },
    },
    include: {
      candidate: { select: { name: true } },
      checks: { orderBy: { checkedAt: 'desc' }, take: 1 },
    },
  });
  const rows = labels.flatMap((l) => {
    const v = ctx.vectorOf(ctx.blockOf(l));
    return [
      {
        id: l.id,
        candidate: l.candidate.name,
        chapter: `${l.candidateId}\n${l.documentUrl}\n${l.heading}`,
        origin: l.origin,
        code: l.capCode,
        // Le verdict d'une carte, sinon le statut décidé.
        verdict:
          l.checks[0]?.verdict ??
          (l.status === LabelStatus.validated ? 'accepted' : 'refused'),
        // Le bon sujet donné par la personne après un refus.
        correctedCode: l.checks[0]?.correctedCode ?? null,
        proposals: l.proposals ?? [],
        vector: v ? Array.from(v, (x) => Math.round(x * 1e5) / 1e5) : null,
      },
    ];
  });
  // La dernière mesure du classeur du rangement, et le nom des sujets : le
  // rapport la garde avec lui, donc son historique est celui des rapports.
  const calibration = await prisma.classifierCalibration.findFirst({
    orderBy: { measuredAt: 'desc' },
    select: {
      measuredAt: true,
      threshold: true,
      right: true,
      total: true,
      results: true,
    },
  });
  // Sur quoi le classeur apprend, et son dernier rangement.
  const persons = await prisma.capLabel.findMany({
    where: {
      decisionMode: DecisionMode.person,
      status: LabelStatus.validated,
    },
    select: { candidateId: true },
  });
  const lastFiling = await prisma.capLabel.findFirst({
    where: { origin: LabelOrigin.model },
    orderBy: { proposedAt: 'desc' },
    select: { proposedAt: true },
  });
  const training = {
    source: trainingSource(
      persons.length,
      new Set(persons.map((p) => p.candidateId)).size,
    ),
    verdicts: persons.length,
    needs: MIN_PERSON_TRAIN,
    lastFiling: lastFiling?.proposedAt ?? null,
  };
  // Toutes les mesures du classeur, dans l'ordre : son évolution.
  const history = (
    await prisma.classifierCalibration.findMany({
      orderBy: { measuredAt: 'asc' },
      select: { measuredAt: true, threshold: true, results: true },
    })
  ).filter((c) => c.results !== null);
  const topics = Object.fromEntries(
    (
      await prisma.capTopic.findMany({
        where: { level: 1 },
        select: { code: true, labelFr: true },
      })
    ).map((t) => [t.code, t.labelFr]),
  );
  // Le journal de la chaîne : ce que l'outil a corrigé (décisions et
  // documents retirés, avec leur raison), l'issue de chaque refus, et les
  // changements du code de lecture et de rangement.
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');
  const toolLabels = await prisma.capLabel.findMany({
    where: { decidedById: TOOL_ACCOUNT_ID, reason: { not: null } },
    select: { decidedAt: true, reason: true },
  });
  const corrections = new Map<string, number>();
  for (const l of toolLabels) {
    const k = `${day(l.decidedAt)}\n${l.reason}`;
    corrections.set(k, (corrections.get(k) ?? 0) + 1);
  }
  const toolDocuments = await prisma.politicalDocument.findMany({
    where: { retiredById: TOOL_ACCOUNT_ID },
    select: { retiredAt: true, retiredReason: true },
  });
  for (const d of toolDocuments) {
    const k = `${day(d.retiredAt)}\nDocument retiré : ${d.retiredReason ?? ''}`;
    corrections.set(k, (corrections.get(k) ?? 0) + 1);
  }
  // Chaque refus d'une personne, et ce qu'il est devenu : rangé dans un
  // autre sujet, sans sujet, pas une position, ou fermé par l'outil parce
  // que la lecture a changé.
  const checks = await prisma.labelCheck.findMany({
    orderBy: { checkedAt: 'asc' },
    select: {
      labelId: true,
      verdict: true,
      checkedAt: true,
      checkedById: true,
    },
  });
  const outcome = new Map<string, string>();
  for (const c of checks)
    if (
      c.verdict !== CheckVerdict.refused &&
      c.verdict !== CheckVerdict.accepted
    )
      outcome.set(c.labelId, c.verdict);
  const refusals = new Map<string, Record<string, number>>();
  for (const c of checks) {
    if (c.verdict !== CheckVerdict.refused || c.checkedById === TOOL_ACCOUNT_ID)
      continue;
    const d = day(c.checkedAt);
    const row = refusals.get(d) ?? {};
    const o = outcome.get(c.labelId) ?? 'pending';
    row[o] = (row[o] ?? 0) + 1;
    refusals.set(d, row);
  }
  let commits: { date: string; subject: string }[] = [];
  try {
    commits = execFileSync(
      'git',
      [
        'log',
        '--since=60 days ago',
        '--date=short',
        '--pretty=%ad\t%s',
        '--',
        'src/domain',
        'src/adapters/programmes',
        'src/features/programmes',
        'src/features/subjects',
      ],
      { cwd: resolve(__dirname, '../..'), encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const [date, subject] = l.split('\t');
        return { date, subject };
      });
  } catch {
    commits = [];
  }
  const pending = execFileSyncSafe(
    'git',
    ['status', '--porcelain', 'src'],
    resolve(__dirname, '../..'),
  )
    .split('\n')
    .filter(Boolean).length;
  const journal = {
    corrections: [...corrections].map(([k, count]) => {
      const [date, reason] = k.split('\n');
      return { date, reason, count };
    }),
    refusals: [...refusals].map(([date, outcomes]) => ({ date, outcomes })),
    commits,
    uncommitted: pending,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify({
      demo,
      exportedAt: new Date(),
      rows,
      classifier: calibration,
      training,
      history,
      topics,
      journal,
    }),
  );
  console.log(
    `${rows.length} rangements exportés${demo ? ' (démonstration : décisions de l’assistant)' : ''} → ${OUT}`,
  );
  await prisma.$disconnect();
}

void main();

/** Une commande git qui ne fait pas échouer l'export. */
function execFileSyncSafe(cmd: string, args: string[], cwd: string): string {
  try {
    return execFileSync(cmd, args, { cwd, encoding: 'utf8' });
  } catch {
    return '';
  }
}
