import { Module } from '@nestjs/common';
import { DataGouvTabular } from '../../adapters/data-gouv/data-gouv-tabular';
import { TABULAR_SOURCE } from '../../ports/tabular-source';
import { CreateLiveSourceController } from './create-live-source/create-live-source';
import { ReadLiveValuesController } from './read-live-values/read-live-values';

/** Les sources lues à la demande, commune par commune, chez leur producteur. */
@Module({
  controllers: [CreateLiveSourceController, ReadLiveValuesController],
  providers: [{ provide: TABULAR_SOURCE, useClass: DataGouvTabular }],
})
export class LiveModule {}
