import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  RequirementDocumentListResponse,
  RequirementDocumentResponse,
  UiSpecificationResponse,
} from '@aj-mock-hub/contracts';
import { MAX_REQUIREMENT_DOCUMENT_BYTES } from '@aj-mock-hub/storage';
import { ApproveUiSpecificationDto } from './dto/approve-ui-specification.dto';
import { UpdateUiSpecificationDto } from './dto/update-ui-specification.dto';
import { RequirementsService } from './requirements.service';

@Controller('projects/:projectId/versions/:versionId')
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: MAX_REQUIREMENT_DOCUMENT_BYTES },
    }),
  )
  upload(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<RequirementDocumentResponse> {
    return this.requirements.upload(projectId, versionId, file);
  }

  @Get('documents')
  listDocuments(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<RequirementDocumentListResponse> {
    return this.requirements.list(projectId, versionId);
  }

  @Post('ui-specification/extract')
  extract(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<UiSpecificationResponse> {
    return this.requirements.extract(projectId, versionId);
  }

  @Get('ui-specification')
  getSpecification(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<UiSpecificationResponse> {
    return this.requirements.getSpecification(projectId, versionId);
  }

  @Put('ui-specification')
  updateSpecification(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: UpdateUiSpecificationDto,
  ): Promise<UiSpecificationResponse> {
    return this.requirements.updateSpecification(projectId, versionId, input);
  }

  @Post('ui-specification/approve')
  approveSpecification(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() input: ApproveUiSpecificationDto,
  ): Promise<UiSpecificationResponse> {
    return this.requirements.approveSpecification(projectId, versionId, input);
  }
}
