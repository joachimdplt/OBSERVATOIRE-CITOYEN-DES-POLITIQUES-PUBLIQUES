import { Module } from '@nestjs/common';
import { OllamaTopicClassifier } from '../../adapters/classifier/ollama-topic-classifier';
import { TOPIC_CLASSIFIER } from '../../ports/topic-classifier';
import { ListCapLabelsController } from './list-cap-labels/list-cap-labels';
import { RemoveCapLabelController } from './remove-cap-label/remove-cap-label';
import { SuggestCapLabelsController } from './suggest-cap-labels/suggest-cap-labels';

/** Le rangement des chapitres des candidats dans la grille CAP. */
@Module({
  controllers: [
    SuggestCapLabelsController,
    ListCapLabelsController,
    RemoveCapLabelController,
  ],
  providers: [{ provide: TOPIC_CLASSIFIER, useClass: OllamaTopicClassifier }],
})
export class SubjectsModule {}
