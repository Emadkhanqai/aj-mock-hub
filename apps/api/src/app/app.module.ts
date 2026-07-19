import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ProjectsModule } from './projects/projects.module';
import { JobsModule } from './jobs/jobs.module';
import { RequirementsModule } from './requirements/requirements.module';

@Module({
  imports: [ProjectsModule, JobsModule, RequirementsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
