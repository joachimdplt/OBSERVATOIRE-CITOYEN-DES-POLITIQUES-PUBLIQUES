import { Module } from '@nestjs/common';
import { WikimediaPhotos } from '../../adapters/wikimedia/wikimedia-photos';
import { PHOTO_SOURCE } from '../../ports/photo-source';
import { WikidataAccounts } from '../../adapters/wikimedia/wikidata-accounts';
import {
  ACCOUNT_SOURCE,
  SITE_ACCOUNT_SOURCE,
} from '../../ports/account-source';
import { WebsiteAccounts } from '../../adapters/web/website-accounts';
import { CollectCandidateAccountsController } from './collect-candidate-accounts/collect-candidate-accounts';
import { CollectCandidatePhotosController } from './collect-candidate-photos/collect-candidate-photos';
import { AddCandidateController } from './add-candidate/add-candidate';
import { CreateElectionController } from './create-election/create-election';

/** Les élections suivies, leurs candidats déclarés et leurs photos libres. */
@Module({
  controllers: [
    CreateElectionController,
    AddCandidateController,
    CollectCandidatePhotosController,
    CollectCandidateAccountsController,
  ],
  // Les photos libres viennent de Wikidata et de Wikimedia Commons.
  providers: [
    { provide: PHOTO_SOURCE, useClass: WikimediaPhotos },
    { provide: ACCOUNT_SOURCE, useClass: WikidataAccounts },
    { provide: SITE_ACCOUNT_SOURCE, useClass: WebsiteAccounts },
  ],
})
export class ElectionsModule {}
