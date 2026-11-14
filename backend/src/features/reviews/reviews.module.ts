import { Module } from '@nestjs/common';
import { ApproveDatasetVersionController } from './approve-dataset-version/approve-dataset-version';
import { GetVersionHistoryController } from './get-version-history/get-version-history';
import { ListReviewQueueController } from './list-review-queue/list-review-queue';
import { PreprintDatasetVersionController } from './preprint-dataset-version/preprint-dataset-version';
import { RejectDatasetVersionController } from './reject-dataset-version/reject-dataset-version';
import { SubmitDatasetVersionController } from './submit-dataset-version/submit-dataset-version';

/** La relecture : soumettre ou prépublier, approuver, rejeter, et l'histoire de chaque décision. */
@Module({
  controllers: [
    SubmitDatasetVersionController,
    PreprintDatasetVersionController,
    ListReviewQueueController,
    ApproveDatasetVersionController,
    RejectDatasetVersionController,
    GetVersionHistoryController,
  ],
})
export class ReviewsModule {}
