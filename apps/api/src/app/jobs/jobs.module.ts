import { Module } from '@nestjs/common';
import { DatabaseModule } from '@aj-mock-hub/database';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PipelineQueueService } from './pipeline-queue.service';

@Module({
  imports: [DatabaseModule],
  controllers: [JobsController],
  providers: [JobsService, PipelineQueueService],
  exports: [PipelineQueueService],
})
export class JobsModule {}
