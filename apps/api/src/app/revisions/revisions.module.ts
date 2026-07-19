import { Module } from '@nestjs/common';
import { DatabaseModule } from '@aj-mock-hub/database';
import { JobsModule } from '../jobs/jobs.module';
import {
  createPreviewStorage,
  PREVIEW_STORAGE,
} from '../previews/previews.providers';
import { RevisionsController } from './revisions.controller';
import { RevisionsService } from './revisions.service';

@Module({
  imports: [DatabaseModule, JobsModule],
  controllers: [RevisionsController],
  providers: [
    RevisionsService,
    { provide: PREVIEW_STORAGE, useFactory: createPreviewStorage },
  ],
})
export class RevisionsModule {}
