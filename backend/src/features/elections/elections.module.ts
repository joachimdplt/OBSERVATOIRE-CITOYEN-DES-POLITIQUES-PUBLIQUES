import { Module } from '@nestjs/common';
import { AddCandidateController } from './add-candidate/add-candidate';
import { CreateElectionController } from './create-election/create-election';

/** Les élections suivies et leurs candidats déclarés. */
@Module({ controllers: [CreateElectionController, AddCandidateController] })
export class ElectionsModule {}
