import { Module } from '@nestjs/common';
import { GetIndicatorController } from './get-indicator/get-indicator';
import { GetIndicatorMapController } from './get-indicator-map/get-indicator-map';
import { GetTerritoryController } from './get-territory/get-territory';
import { ListTerritoryValuesController } from './list-territory-values/list-territory-values';
import { ListIndicatorObservationsController } from './list-indicator-observations/list-indicator-observations';
import { ListIndicatorsController } from './list-indicators/list-indicators';
import { ListPublicationsPublicController } from './list-publications/list-publications';
import { GetPublicationController } from './get-publication/get-publication';
import { GetElectionController } from './get-election/get-election';
import { SearchTerritoriesController } from './search-territories/search-territories';

/**
 * Ce que lit le public, sans compte. Aucune route d'écriture, aucun accès aux
 * fichiers bruts ni aux comptes (vérifié par architecture.spec.ts).
 */
@Module({
  controllers: [
    GetTerritoryController,
    SearchTerritoriesController,
    ListTerritoryValuesController,
    ListIndicatorsController,
    ListPublicationsPublicController,
    GetPublicationController,
    GetElectionController,
    GetIndicatorController,
    GetIndicatorMapController,
    ListIndicatorObservationsController,
  ],
})
export class PublicModule {}
