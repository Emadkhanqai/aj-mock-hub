import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { StaticPreviewResponse } from '@aj-mock-hub/contracts';
import type { Response } from 'express';
import { PreviewsService } from './previews.service';

@Controller('projects/:projectId/versions/:versionId/preview')
export class PreviewsController {
  constructor(private readonly previews: PreviewsService) {}

  @Get()
  get(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<StaticPreviewResponse> {
    return this.previews.get(projectId, versionId);
  }

  @Get('files/*path')
  @Header(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
  )
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async file(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Param('path') path: string | string[],
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.previews.getFile(projectId, versionId, path);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    response.send(file.body);
  }
}
