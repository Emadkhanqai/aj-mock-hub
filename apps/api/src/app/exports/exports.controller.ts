import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type {
  DeveloperExportListResponse,
  DeveloperExportResponse,
  ShareDeveloperExportResponse,
} from '@aj-mock-hub/contracts';
import type { Response } from 'express';
import { ShareDeveloperExportDto } from './dto/share-developer-export.dto';
import { ExportsService } from './exports.service';

@Controller()
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Post('projects/:projectId/versions/:versionId/exports')
  create(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<DeveloperExportResponse> {
    return this.exports.create(projectId, versionId);
  }

  @Get('projects/:projectId/versions/:versionId/exports')
  list(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<DeveloperExportListResponse> {
    return this.exports.list(projectId, versionId);
  }

  @Post('projects/:projectId/exports/:exportId/share')
  share(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('exportId', new ParseUUIDPipe({ version: '4' })) exportId: string,
    @Body() input: ShareDeveloperExportDto,
  ): Promise<ShareDeveloperExportResponse> {
    return this.exports.share(projectId, exportId, input.email);
  }

  @Get('exports/:exportId/download')
  @Header('Cache-Control', 'no-store')
  async download(
    @Param('exportId', new ParseUUIDPipe({ version: '4' })) exportId: string,
    @Query('expires', ParseIntPipe) expires: number,
    @Query('signature') signature: string,
    @Res() response: Response,
  ): Promise<void> {
    const artifact = await this.exports.download(exportId, expires, signature);
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${artifact.fileName}"`,
    );
    response.send(artifact.body);
  }
}
