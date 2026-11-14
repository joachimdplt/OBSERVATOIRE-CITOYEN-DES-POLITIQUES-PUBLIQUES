import { Module } from '@nestjs/common';
import { ApprovePublicationController } from './approve-publication/approve-publication';
import { CreatePublicationController } from './create-publication/create-publication';
import { ListPublicationsController } from './list-publications/list-publications';
import { OpenPublicationDraftController } from './open-publication-draft/open-publication-draft';
import { PreprintPublicationController } from './preprint-publication/preprint-publication';
import { WritePublicationDraftController } from './write-publication-draft/write-publication-draft';

/**
 * Les publications : les enjeux que l'observatoire écrit à partir des
 * indicateurs vérifiés, et qui passent la relecture comme un article.
 */
@Module({
  controllers: [
    ListPublicationsController,
    CreatePublicationController,
    WritePublicationDraftController,
    PreprintPublicationController,
    ApprovePublicationController,
    OpenPublicationDraftController,
  ],
})
export class PublicationsModule {}
