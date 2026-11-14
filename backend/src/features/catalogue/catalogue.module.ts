import { Module } from '@nestjs/common';
import { AddIndicatorSourceController } from './add-indicator-source/add-indicator-source';
import { RetireIndicatorSourceController } from './retire-indicator-source/retire-indicator-source';
import { CreateDatasetController } from './create-dataset/create-dataset';
import { UpdateIndicatorReadingController } from './update-indicator-reading/update-indicator-reading';
import { CreateIndicatorController } from './create-indicator/create-indicator';
import { CreateProviderController } from './create-provider/create-provider';
import { ListCatalogueController } from './list-catalogue/list-catalogue';

/** Le catalogue : les producteurs, leurs jeux, les indicateurs de chaque jeu. */
@Module({
  controllers: [
    CreateProviderController,
    CreateDatasetController,
    CreateIndicatorController,
    AddIndicatorSourceController,
    RetireIndicatorSourceController,
    UpdateIndicatorReadingController,
    ListCatalogueController,
  ],
})
export class CatalogueModule {}
