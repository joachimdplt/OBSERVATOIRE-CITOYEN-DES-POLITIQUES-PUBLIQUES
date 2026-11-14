import { Module } from '@nestjs/common';
import { GetTerritoryController } from './get-territory/get-territory';

/**
 * Ce que lit le public, sans compte. Aucune route d'écriture, aucun accès aux
 * fichiers bruts ni aux comptes (vérifié par architecture.spec.ts).
 */
@Module({ controllers: [GetTerritoryController] })
export class PublicModule {}
