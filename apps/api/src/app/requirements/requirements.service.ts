import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  RequirementDocumentListResponse,
  RequirementDocumentMediaType,
  RequirementDocumentResponse,
  UiSpecificationContent,
  UiSpecificationResponse,
} from '@aj-mock-hub/contracts';
import { REQUIREMENT_DOCUMENT_MEDIA_TYPES } from '@aj-mock-hub/contracts';
import {
  Prisma,
  PrismaService,
  type RequirementDocument,
  type UiSpecification,
} from '@aj-mock-hub/database';
import {
  DocumentExtractor,
  uiSpecificationSchema,
  type RequirementsInput,
  type RequirementsProvider,
} from '@aj-mock-hub/generation';
import {
  MAX_REQUIREMENT_DOCUMENT_BYTES,
  type ObjectStorage,
} from '@aj-mock-hub/storage';
import type { ApproveUiSpecificationDto } from './dto/approve-ui-specification.dto';
import type { UpdateUiSpecificationDto } from './dto/update-ui-specification.dto';
import {
  OBJECT_STORAGE,
  REQUIREMENTS_PROVIDER,
} from './requirements.providers';

const MAX_DOCUMENTS_PER_VERSION = 10;

@Injectable()
export class RequirementsService {
  private readonly extractor = new DocumentExtractor();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(REQUIREMENTS_PROVIDER)
    private readonly provider: RequirementsProvider,
  ) {}

  async upload(
    projectId: string,
    versionId: string,
    file: Express.Multer.File | undefined,
  ): Promise<RequirementDocumentResponse> {
    if (!file) {
      throw new BadRequestException({
        code: 'DOCUMENT_REQUIRED',
        message: 'A requirements document is required.',
      });
    }
    this.validateFile(file);
    await this.requireVersion(projectId, versionId);
    const approved = await this.prisma.uiSpecification.findFirst({
      where: { projectId, projectVersionId: versionId, status: 'APPROVED' },
      select: { id: true },
    });
    if (approved) this.approvedConflict();
    const count = await this.prisma.requirementDocument.count({
      where: { projectVersionId: versionId },
    });
    if (count >= MAX_DOCUMENTS_PER_VERSION) {
      throw new BadRequestException({
        code: 'DOCUMENT_LIMIT_REACHED',
        message: `A version can contain at most ${MAX_DOCUMENTS_PER_VERSION} documents.`,
      });
    }

    const safeName = this.safeFilename(file.originalname);
    const key = `projects/${projectId}/versions/${versionId}/documents/${randomUUID()}-${safeName}`;
    try {
      await this.storage.put(key, file.buffer, file.mimetype);
      const document = await this.prisma.requirementDocument.create({
        data: {
          projectId,
          projectVersionId: versionId,
          originalName: safeName,
          mediaType: file.mimetype,
          byteSize: file.size,
          storageKey: key,
        },
      });
      return this.mapDocument(document);
    } catch (error: unknown) {
      await this.storage.delete(key).catch(() => undefined);
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException({
        code: 'DOCUMENT_STORAGE_UNAVAILABLE',
        message: 'The document could not be stored. Please retry.',
      });
    }
  }

  async list(
    projectId: string,
    versionId: string,
  ): Promise<RequirementDocumentListResponse> {
    await this.requireVersion(projectId, versionId);
    const items = await this.prisma.requirementDocument.findMany({
      where: { projectId, projectVersionId: versionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return { items: items.map((item) => this.mapDocument(item)) };
  }

  async extract(
    projectId: string,
    versionId: string,
  ): Promise<UiSpecificationResponse> {
    const version = await this.requireVersion(projectId, versionId);
    const current = await this.prisma.uiSpecification.findUnique({
      where: { projectVersionId: versionId },
    });
    if (current?.status === 'APPROVED') this.approvedConflict();
    const documents = await this.prisma.requirementDocument.findMany({
      where: { projectId, projectVersionId: versionId },
      orderBy: { createdAt: 'asc' },
    });
    const extracted: RequirementsInput['documents'] = [];
    for (const document of documents) {
      try {
        const content = await this.storage.get(document.storageKey);
        const mediaType = document.mediaType as RequirementDocumentMediaType;
        let extractedTextKey: string | null = null;
        if (mediaType.startsWith('image/')) {
          extracted.push({
            name: document.originalName,
            mediaType,
            base64: content.toString('base64'),
          });
        } else {
          const text = await this.extractor.extract(mediaType, content);
          extractedTextKey = `${document.storageKey}.extracted.txt`;
          await this.storage.put(
            extractedTextKey,
            Buffer.from(text),
            'text/plain',
          );
          extracted.push({ name: document.originalName, mediaType, text });
        }
        await this.prisma.requirementDocument.update({
          where: { id: document.id },
          data: {
            status: 'EXTRACTED',
            extractedTextKey,
            errorMessage: null,
          },
        });
      } catch (error: unknown) {
        await this.prisma.requirementDocument.update({
          where: { id: document.id },
          data: {
            status: 'FAILED',
            errorMessage: this.safeError(error),
          },
        });
        throw new BadRequestException({
          code: 'DOCUMENT_EXTRACTION_FAILED',
          message: `Content could not be read from ${document.originalName}.`,
        });
      }
    }

    const content = await this.provider.extract({
      instructions: version.instructionsSnapshot,
      documents: extracted,
    });
    const specification = await this.prisma.uiSpecification.upsert({
      where: { projectVersionId: versionId },
      create: {
        projectId,
        projectVersionId: versionId,
        content: content as unknown as Prisma.InputJsonValue,
      },
      update: { content: content as unknown as Prisma.InputJsonValue },
    });
    return this.mapSpecification(specification);
  }

  async getSpecification(
    projectId: string,
    versionId: string,
  ): Promise<UiSpecificationResponse> {
    await this.requireVersion(projectId, versionId);
    const specification = await this.prisma.uiSpecification.findFirst({
      where: { projectId, projectVersionId: versionId },
    });
    if (!specification) this.specificationNotFound();
    return this.mapSpecification(specification);
  }

  async updateSpecification(
    projectId: string,
    versionId: string,
    input: UpdateUiSpecificationDto,
  ): Promise<UiSpecificationResponse> {
    const content = this.parseContent(input.content);
    const result = await this.prisma.uiSpecification.updateMany({
      where: {
        projectId,
        projectVersionId: versionId,
        status: 'DRAFT',
        updatedAt: new Date(input.expectedUpdatedAt),
      },
      data: { content: content as unknown as Prisma.InputJsonValue },
    });
    if (result.count === 0)
      await this.resolveMutationConflict(projectId, versionId);
    return this.getSpecification(projectId, versionId);
  }

  async approveSpecification(
    projectId: string,
    versionId: string,
    input: ApproveUiSpecificationDto,
  ): Promise<UiSpecificationResponse> {
    const current = await this.prisma.uiSpecification.findFirst({
      where: { projectId, projectVersionId: versionId },
    });
    if (!current) this.specificationNotFound();
    if (this.parseContent(current.content).openQuestions.length > 0) {
      throw new ConflictException({
        code: 'REQUIREMENTS_CLARIFICATION_REQUIRED',
        message:
          'Resolve every open question before approving the UI specification.',
      });
    }
    const result = await this.prisma.uiSpecification.updateMany({
      where: {
        projectId,
        projectVersionId: versionId,
        status: 'DRAFT',
        updatedAt: new Date(input.expectedUpdatedAt),
      },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    if (result.count === 0)
      await this.resolveMutationConflict(projectId, versionId);
    return this.getSpecification(projectId, versionId);
  }

  private async requireVersion(projectId: string, versionId: string) {
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) {
      throw new NotFoundException({
        code: 'PROJECT_VERSION_NOT_FOUND',
        message: 'Project version not found.',
      });
    }
    return version;
  }

  private validateFile(file: Express.Multer.File): void {
    if (
      !REQUIREMENT_DOCUMENT_MEDIA_TYPES.includes(
        file.mimetype as RequirementDocumentMediaType,
      )
    ) {
      throw new BadRequestException({
        code: 'DOCUMENT_TYPE_UNSUPPORTED',
        message:
          'Only TXT, Markdown, PDF, DOCX, PNG, JPG, and WebP files are supported.',
      });
    }
    if (file.size < 1 || file.size > MAX_REQUIREMENT_DOCUMENT_BYTES) {
      throw new BadRequestException({
        code: 'DOCUMENT_SIZE_INVALID',
        message: 'Documents must be between 1 byte and 10 MB.',
      });
    }
  }

  private safeFilename(filename: string): string {
    const normalized = filename
      .normalize('NFKC')
      .replace(/[^a-zA-Z0-9._-]/g, '-');
    return normalized.replace(/^-+/, '').slice(0, 200) || 'document';
  }

  private parseContent(content: unknown): UiSpecificationContent {
    const result = uiSpecificationSchema.safeParse(content);
    if (!result.success) {
      throw new BadRequestException({
        code: 'UI_SPECIFICATION_INVALID',
        message: 'The UI specification does not match the required structure.',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data as unknown as UiSpecificationContent;
  }

  private async resolveMutationConflict(
    projectId: string,
    versionId: string,
  ): Promise<never> {
    const current = await this.prisma.uiSpecification.findFirst({
      where: { projectId, projectVersionId: versionId },
    });
    if (!current) this.specificationNotFound();
    if (current.status === 'APPROVED') this.approvedConflict();
    throw new ConflictException({
      code: 'UI_SPECIFICATION_STALE',
      message: 'The specification changed. Refresh before saving again.',
    });
  }

  private mapDocument(
    document: RequirementDocument,
  ): RequirementDocumentResponse {
    return {
      id: document.id,
      projectId: document.projectId,
      projectVersionId: document.projectVersionId,
      originalName: document.originalName,
      mediaType: document.mediaType as RequirementDocumentMediaType,
      byteSize: document.byteSize,
      status: document.status,
      errorMessage: document.errorMessage,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  private mapSpecification(
    specification: UiSpecification,
  ): UiSpecificationResponse {
    return {
      id: specification.id,
      projectId: specification.projectId,
      projectVersionId: specification.projectVersionId,
      status: specification.status,
      content: this.parseContent(specification.content),
      approvedAt: specification.approvedAt?.toISOString() ?? null,
      createdAt: specification.createdAt.toISOString(),
      updatedAt: specification.updatedAt.toISOString(),
    };
  }

  private safeError(error: unknown): string {
    return error instanceof Error
      ? error.message.slice(0, 500)
      : 'Document extraction failed.';
  }

  private specificationNotFound(): never {
    throw new NotFoundException({
      code: 'UI_SPECIFICATION_NOT_FOUND',
      message: 'UI specification not found.',
    });
  }

  private approvedConflict(): never {
    throw new ConflictException({
      code: 'UI_SPECIFICATION_APPROVED',
      message: 'An approved UI specification is immutable.',
    });
  }
}
