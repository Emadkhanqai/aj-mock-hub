import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type {
  ProjectListResponse,
  ProjectResponse,
  ProjectVersionListResponse,
  ProjectVersionResponse,
  ProjectVersionComparisonResponse,
} from '@aj-mock-hub/contracts';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectVersionDto } from './dto/create-project-version.dto';
import { CopyProjectVersionDto } from './dto/copy-project-version.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(@Body() input: CreateProjectDto): Promise<ProjectResponse> {
    return this.projectsService.createProject(input);
  }

  @Get()
  listProjects(): Promise<ProjectListResponse> {
    return this.projectsService.listProjects();
  }

  @Get(':projectId')
  getProject(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ): Promise<ProjectResponse> {
    return this.projectsService.getProject(projectId);
  }

  @Post(':projectId/versions')
  createVersion(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() input: CreateProjectVersionDto,
  ): Promise<ProjectVersionResponse> {
    return this.projectsService.createVersion(projectId, input);
  }

  @Get(':projectId/versions')
  listVersions(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ): Promise<ProjectVersionListResponse> {
    return this.projectsService.listVersions(projectId);
  }

  @Get(':projectId/versions/:versionId')
  getVersion(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<ProjectVersionResponse> {
    return this.projectsService.getVersion(projectId, versionId);
  }

  @Post(':projectId/versions/:versionId/duplicate')
  duplicateVersion(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: CopyProjectVersionDto,
  ): Promise<ProjectVersionResponse> {
    return this.projectsService.duplicateVersion(
      projectId,
      versionId,
      input.label,
    );
  }

  @Post(':projectId/versions/:versionId/restore')
  restoreVersion(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: CopyProjectVersionDto,
  ): Promise<ProjectVersionResponse> {
    return this.projectsService.restoreVersion(
      projectId,
      versionId,
      input.label,
    );
  }

  @Get(':projectId/versions/:leftVersionId/compare/:rightVersionId')
  compareVersions(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('leftVersionId', new ParseUUIDPipe({ version: '4' })) left: string,
    @Param('rightVersionId', new ParseUUIDPipe({ version: '4' })) right: string,
  ): Promise<ProjectVersionComparisonResponse> {
    return this.projectsService.compareVersions(projectId, left, right);
  }
}
