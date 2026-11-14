import { Module } from '@nestjs/common';
import { WebProgrammeReader } from '../../adapters/programmes/web-programme-reader';
import { PROGRAMME_READER } from '../../ports/programme-reader';
import { RawFileStore } from '../../storage/raw-file-store';
import { AddProgrammeSourceController } from './add-programme-source/add-programme-source';
import { CollectProgrammesController } from './collect-programmes/collect-programmes';
import { SaveTopicController } from './save-topic/save-topic';

/** Les programmes des candidats, collectés en ligne, et les enjeux qui les rangent. */
@Module({
  controllers: [
    AddProgrammeSourceController,
    CollectProgrammesController,
    SaveTopicController,
  ],
  providers: [
    RawFileStore,
    { provide: PROGRAMME_READER, useClass: WebProgrammeReader },
  ],
})
export class ProgrammesModule {}
