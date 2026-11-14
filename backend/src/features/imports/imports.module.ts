import { Module } from '@nestjs/common';
import { ColumnMappingNormalizer } from '../../adapters/column-mapping/column-mapping-normalizer';
import { CsvImporter } from '../../adapters/csv/csv-importer';
import { XlsxImporter } from '../../adapters/xlsx/xlsx-importer';
import { OBSERVATION_NORMALIZER } from '../../ports/observation-normalizer';
import { SOURCE_DATASET_IMPORTERS } from '../../ports/source-dataset-importer';
import { RawFileStore } from '../../storage/raw-file-store';
import { DescribeImportJobController } from './describe-import-job/describe-import-job';
import { GetImportJobController } from './get-import-job/get-import-job';
import { ListDatasetVersionsController } from './list-dataset-versions/list-dataset-versions';
import { UploadDatasetVersionController } from './upload-dataset-version/upload-dataset-version';
import { ValidateImportJobController } from './validate-import-job/validate-import-job';

/**
 * Le dépôt d'un fichier, sa lecture, sa description et son contrôle. Les
 * lecteurs de format et le normaliseur sont branchés ici, et nulle part
 * ailleurs : une slice ne connaît que les ports.
 */
@Module({
  controllers: [
    UploadDatasetVersionController,
    GetImportJobController,
    ListDatasetVersionsController,
    DescribeImportJobController,
    ValidateImportJobController,
  ],
  providers: [
    RawFileStore,
    {
      provide: SOURCE_DATASET_IMPORTERS,
      useFactory: () => [new CsvImporter(), new XlsxImporter()],
    },
    { provide: OBSERVATION_NORMALIZER, useClass: ColumnMappingNormalizer },
  ],
})
export class ImportsModule {}
