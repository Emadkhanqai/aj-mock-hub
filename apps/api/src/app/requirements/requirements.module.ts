import { Module } from '@nestjs/common';
import { DatabaseModule } from '@aj-mock-hub/database';
import { RequirementsController } from './requirements.controller';
import {
  createObjectStorage,
  createRequirementsProvider,
  OBJECT_STORAGE,
  REQUIREMENTS_PROVIDER,
} from './requirements.providers';
import { RequirementsService } from './requirements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RequirementsController],
  providers: [
    RequirementsService,
    { provide: OBJECT_STORAGE, useFactory: createObjectStorage },
    { provide: REQUIREMENTS_PROVIDER, useFactory: createRequirementsProvider },
  ],
})
export class RequirementsModule {}
