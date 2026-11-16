import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ApiKeyMiddleware } from '../../api-access/api-key.middleware';
import { GetIndicatorController } from './get-indicator/get-indicator';
import { GetIndicatorMapController } from './get-indicator-map/get-indicator-map';
import { GetTerritoryController } from './get-territory/get-territory';
import { ListTerritoryValuesController } from './list-territory-values/list-territory-values';
import { ListIndicatorObservationsController } from './list-indicator-observations/list-indicator-observations';
import { ListIndicatorsController } from './list-indicators/list-indicators';
import { ListPublicationsPublicController } from './list-publications/list-publications';
import { GetPublicationController } from './get-publication/get-publication';
import { GetElectionController } from './get-election/get-election';
import { GetCandidateController } from './get-candidate/get-candidate';
import { GetCandidateProgrammeController } from './get-candidate-programme/get-candidate-programme';
import { GetUpdatesController } from './get-updates/get-updates';
import { GetSubjectController } from './get-subject/get-subject';
import { GetCandidateSubjectsController } from './get-candidate-subjects/get-candidate-subjects';
import { ListCapTopicsController } from './list-cap-topics/list-cap-topics';
import { ListFunctionsController } from './list-functions/list-functions';
import { GetTopicController } from './get-topic/get-topic';
import { ListTopicsController } from './list-topics/list-topics';
import { SearchTerritoriesController } from './search-territories/search-territories';

/**
 * Ce que lit le public, avec une clé d'API. Aucune route d'écriture, aucun
 * accès aux fichiers bruts ni aux comptes (vérifié par architecture.spec.ts).
 */
const CONTROLLERS = [
  GetUpdatesController,
  ListFunctionsController,
  ListCapTopicsController,
  GetSubjectController,
  GetTerritoryController,
  SearchTerritoriesController,
  ListTerritoryValuesController,
  ListIndicatorsController,
  ListPublicationsPublicController,
  GetPublicationController,
  GetElectionController,
  GetCandidateController,
  GetCandidateProgrammeController,
  GetCandidateSubjectsController,
  ListTopicsController,
  GetTopicController,
  GetIndicatorController,
  GetIndicatorMapController,
  ListIndicatorObservationsController,
];

@Module({
  controllers: CONTROLLERS,
})
export class PublicModule implements NestModule {
  // Toute lecture publique demande une clé (celle du site, ou une clé donnée).
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyMiddleware).forRoutes(...CONTROLLERS);
  }
}
