import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from '@aj-mock-hub/database';
import { PipelineWorkerService } from './pipeline-worker.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController],
  providers: [PipelineWorkerService],
})
export class AppModule {}
