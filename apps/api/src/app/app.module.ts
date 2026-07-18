import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ProjectsModule } from './projects/projects.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [ProjectsModule, JobsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
