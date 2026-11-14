import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TestAgent from 'supertest/lib/agent';
import { readCog } from '../src/adapters/cog/read-cog';
import { loadCogVintage } from '../src/features/territories/load-cog-vintage/load-cog-vintage';
import { PrismaService } from '../src/prisma/prisma.service';

const COG = join(__dirname, 'fixtures/cog-2026');
const cog = (name: string) => ({
  url: name,
  content: readFileSync(join(COG, name), 'utf8'),
});

/** Le COG 2026 réduit, la DREES, le jeu APL et son indicateur, déclarés par `createdById`. */
export async function seedApl(prisma: PrismaService, createdById: string) {
  const files = [
    'v_region_2026.csv',
    'v_departement_2026.csv',
    'v_commune_2026.csv',
  ].map(cog);
  const [regions, departments, communes] = files.map((f) => f.content);
  await loadCogVintage(
    prisma,
    2026,
    files,
    readCog({ regions, departments, communes }),
  );

  const provider = await prisma.dataProvider.create({
    data: {
      name: 'DREES',
      acronym: 'DREES',
      kind: 'statistical_service',
      officialUrl: 'https://drees.solidarites-sante.gouv.fr',
      createdById,
    },
  });
  const dataset = await prisma.sourceDataset.create({
    data: {
      providerId: provider.id,
      producerRef: 'apl',
      title: 'APL',
      url: 'https://data.drees.solidarites-sante.gouv.fr/apl',
      license: 'Licence Ouverte v2.0',
      methodology: 'Méthode concertée',
      frequency: 'annual',
      createdById,
    },
  });
  await prisma.indicatorDefinition.create({
    data: {
      code: 'apl-medecins-generalistes',
      datasetId: dataset.id,
      label: 'APL aux médecins généralistes',
      definition: 'Consultations accessibles par habitant standardisé.',
      scope: 'Toutes communes.',
      unit: 'consultations par habitant standardisé',
      pillar: 'health',
      allowedAggregations: [],
      method: 'DREES',
      limits: 'Pas un nombre de médecins manquants.',
      createdById,
    },
  });
  return dataset.id;
}

/** Un fichier APL à trois communes ; valeurs inventées pour le test. */
export const aplFile = (value: string) =>
  Buffer.from(
    ['Code commune;APL', `01001;${value}`, '2A004;', '97101;s'].join('\n'),
    'utf8',
  );

type Uploaded = { version: { id: string }; job: { id: string } };

/** Déposé, décrit et contrôlé sans anomalie bloquante, par `agent`. */
export async function validatedVersion(
  agent: TestAgent,
  datasetId: string,
  vintage: string,
  value: string,
) {
  const { version, job } = (
    await agent
      .post(`/api/admin/datasets/${datasetId}/versions`)
      .field('vintage', vintage)
      .field(
        'fileUrl',
        `https://data.drees.solidarites-sante.gouv.fr/apl-${vintage}.csv`,
      )
      .field('collectedAt', '2026-11-14')
      .attach('file', aplFile(value), `apl-${vintage}.csv`)
      .expect(201)
  ).body as Uploaded;
  await agent
    .put(`/api/admin/import-jobs/${job.id}/description`)
    .send({
      headerRow: 1,
      territory: { column: 'Code commune', level: 'commune', vintage: 2026 },
      period: { value: vintage },
      decimalSeparator: ',',
      values: [{ column: 'APL', indicatorCode: 'apl-medecins-generalistes' }],
    })
    .expect(200);
  await agent.post(`/api/admin/import-jobs/${job.id}/validate`).expect(200);
  return { versionId: version.id, jobId: job.id };
}
