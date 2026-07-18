import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type {
  CreatePipelineJobResponse,
  PipelineJobDetailResponse,
  PipelineJobListResponse,
  PipelineJobResponse,
} from '@aj-mock-hub/contracts';
import { CreatePipelineJobDto } from './dto/create-pipeline-job.dto';
import { JobsService } from './jobs.service';

@Controller('projects/:projectId')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post('versions/:versionId/jobs')
  create(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: CreatePipelineJobDto,
  ): Promise<CreatePipelineJobResponse> {
    return this.jobs.create(projectId, versionId, input);
  }

  @Get('versions/:versionId/jobs')
  list(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<PipelineJobListResponse> {
    return this.jobs.list(projectId, versionId);
  }

  @Get('jobs/:jobId')
  get(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('jobId', new ParseUUIDPipe({ version: '4' })) jobId: string,
  ): Promise<PipelineJobDetailResponse> {
    return this.jobs.get(projectId, jobId);
  }

  @Post('jobs/:jobId/cancel')
  cancel(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('jobId', new ParseUUIDPipe({ version: '4' })) jobId: string,
  ): Promise<PipelineJobResponse> {
    return this.jobs.cancel(projectId, jobId);
  }
}
