import { Module } from '@nestjs/common';
import { DatabaseModule } from '@aj-mock-hub/database';
import { ExportsController } from './exports.controller';
import { EXPORT_STORAGE, createExportStorage } from './exports.providers';
import { ExportsService } from './exports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ExportsController],
  providers: [
    ExportsService,
    { provide: EXPORT_STORAGE, useFactory: createExportStorage },
  ],
})
export class ExportsModule {}
