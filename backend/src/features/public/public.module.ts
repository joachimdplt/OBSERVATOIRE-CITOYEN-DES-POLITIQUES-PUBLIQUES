import { Module } from '@nestjs/common';
import { GetIndicatorController } from './get-indicator/get-indicator';
import { GetIndicatorMapController } from './get-indicator-map/get-indicator-map';
import { GetTerritoryController } from './get-territory/get-territory';
import { ListIndicatorObservationsController } from './list-indicator-observations/list-indicator-observations';
import { ListIndicatorsController } from './list-indicators/list-indicators';

/**
 * Ce que lit le public, sans compte. Aucune route d'écriture, aucun accès aux
 * fichiers bruts ni aux comptes (vérifié par architecture.spec.ts).
 */
@Module({
  controllers: [
    GetTerritoryController,
    ListIndicatorsController,
    GetIndicatorController,
    GetIndicatorMapController,
    ListIndicatorObservationsController,
  ],
})
export class PublicModule {}
