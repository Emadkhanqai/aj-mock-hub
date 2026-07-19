import { Module } from '@nestjs/common';
import { DatabaseModule } from '@aj-mock-hub/database';
import { PreviewsController } from './previews.controller';
import { createPreviewStorage, PREVIEW_STORAGE } from './previews.providers';
import { PreviewsService } from './previews.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PreviewsController],
  providers: [
    PreviewsService,
    { provide: PREVIEW_STORAGE, useFactory: createPreviewStorage },
  ],
})
export class PreviewsModule {}
