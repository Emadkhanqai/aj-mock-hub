import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ProjectsModule } from './projects/projects.module';
import { JobsModule } from './jobs/jobs.module';
import { RequirementsModule } from './requirements/requirements.module';
import { PreviewsModule } from './previews/previews.module';
import { RevisionsModule } from './revisions/revisions.module';
import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [
    ProjectsModule,
    JobsModule,
    RequirementsModule,
    PreviewsModule,
    RevisionsModule,
    ExportsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
