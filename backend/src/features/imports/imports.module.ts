import { Module } from '@nestjs/common';
import { CsvImporter } from '../../adapters/csv/csv-importer';
import { XlsxImporter } from '../../adapters/xlsx/xlsx-importer';
import { SOURCE_DATASET_IMPORTERS } from '../../ports/source-dataset-importer';
import { RawFileStore } from '../../storage/raw-file-store';
import { GetImportJobController } from './get-import-job/get-import-job';
import { ListDatasetVersionsController } from './list-dataset-versions/list-dataset-versions';
import { UploadDatasetVersionController } from './upload-dataset-version/upload-dataset-version';

/**
 * Le dépôt d'un fichier et sa lecture. Les lecteurs de format sont branchés
 * ici, et nulle part ailleurs : une slice ne connaît que le port.
 */
@Module({
  controllers: [
    UploadDatasetVersionController,
    GetImportJobController,
    ListDatasetVersionsController,
  ],
  providers: [
    RawFileStore,
    {
      provide: SOURCE_DATASET_IMPORTERS,
      useFactory: () => [new CsvImporter(), new XlsxImporter()],
    },
  ],
})
export class ImportsModule {}
