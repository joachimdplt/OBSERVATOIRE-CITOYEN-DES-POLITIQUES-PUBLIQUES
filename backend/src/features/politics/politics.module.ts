import { Module } from '@nestjs/common';
import { AddMeasureController } from './add-measure/add-measure';
import { CreatePoliticalDocumentController } from './create-political-document/create-political-document';
import { ListPoliticalDocumentsController } from './list-political-documents/list-political-documents';

/** Les textes politiques et leurs mesures, cités mot pour mot. */
@Module({
  controllers: [
    ListPoliticalDocumentsController,
    CreatePoliticalDocumentController,
    AddMeasureController,
  ],
})
export class PoliticsModule {}
