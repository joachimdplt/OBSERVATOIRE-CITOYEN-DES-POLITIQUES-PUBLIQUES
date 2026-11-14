import { Module } from '@nestjs/common';
import { AssembleeOpenData } from '../../adapters/assemblee/assemblee-open-data';
import { PARLIAMENT_SOURCE } from '../../ports/parliament-source';
import { CollectParliamentTextsController } from './collect-parliament-texts/collect-parliament-texts';
import { AddMeasureController } from './add-measure/add-measure';
import { CreatePoliticalDocumentController } from './create-political-document/create-political-document';
import { ListPoliticalDocumentsController } from './list-political-documents/list-political-documents';

/** Les textes politiques et leurs mesures, cités mot pour mot. */
@Module({
  controllers: [
    ListPoliticalDocumentsController,
    CreatePoliticalDocumentController,
    AddMeasureController,
    CollectParliamentTextsController,
  ],
  // Les données ouvertes de l'Assemblée ; le Sénat viendra par le même port.
  providers: [{ provide: PARLIAMENT_SOURCE, useClass: AssembleeOpenData }],
})
export class PoliticsModule {}
