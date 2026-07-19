import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type {
  AcceptDraftRevisionResponse,
  DraftRevisionListResponse,
  DraftRevisionResponse,
} from '@aj-mock-hub/contracts';
import type { Response } from 'express';
import { AcceptDraftRevisionDto } from './dto/accept-draft-revision.dto';
import { CreateDraftRevisionDto } from './dto/create-draft-revision.dto';
import { RevisionsService } from './revisions.service';

@Controller('projects/:projectId')
export class RevisionsController {
  constructor(private readonly revisions: RevisionsService) {}

  @Post('versions/:versionId/revisions')
  create(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: CreateDraftRevisionDto,
  ): Promise<DraftRevisionResponse> {
    return this.revisions.create(projectId, versionId, input);
  }

  @Get('versions/:versionId/revisions')
  list(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<DraftRevisionListResponse> {
    return this.revisions.list(projectId, versionId);
  }

  @Get('revisions/:revisionId')
  get(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('revisionId', new ParseUUIDPipe({ version: '4' }))
    revisionId: string,
  ): Promise<DraftRevisionResponse> {
    return this.revisions.get(projectId, revisionId);
  }

  @Post('revisions/:revisionId/discard')
  discard(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('revisionId', new ParseUUIDPipe({ version: '4' }))
    revisionId: string,
  ): Promise<DraftRevisionResponse> {
    return this.revisions.discard(projectId, revisionId);
  }

  @Post('revisions/:revisionId/accept')
  accept(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('revisionId', new ParseUUIDPipe({ version: '4' }))
    revisionId: string,
    @Body() input: AcceptDraftRevisionDto,
  ): Promise<AcceptDraftRevisionResponse> {
    return this.revisions.accept(projectId, revisionId, input);
  }

  @Get('revisions/:revisionId/preview/files/*path')
  @Header(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
  )
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async previewFile(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('revisionId', new ParseUUIDPipe({ version: '4' }))
    revisionId: string,
    @Param('path') path: string | string[],
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.revisions.getPreviewFile(
      projectId,
      revisionId,
      path,
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    response.send(file.body);
  }
}
