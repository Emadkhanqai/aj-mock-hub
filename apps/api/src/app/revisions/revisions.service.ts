import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  AcceptDraftRevisionResponse,
  DraftRevisionListResponse,
  DraftRevisionResponse,
  ProjectVersionResponse,
  UiSpecificationContent,
} from '@aj-mock-hub/contracts';
import {
  PrismaService,
  type DraftRevision,
  type ProjectVersion,
} from '@aj-mock-hub/database';
import { WorkspaceService, type ObjectStorage } from '@aj-mock-hub/storage';
import { PipelineQueueService } from '../jobs/pipeline-queue.service';
import { PREVIEW_STORAGE } from '../previews/previews.providers';
import { AcceptDraftRevisionDto } from './dto/accept-draft-revision.dto';
import { CreateDraftRevisionDto } from './dto/create-draft-revision.dto';

export interface RevisionPreviewFile {
  body: Buffer;
  contentType: string;
}

@Injectable()
export class RevisionsService {
  private readonly workspace = new WorkspaceService(
    process.env['WORKSPACE_ROOT'] ?? 'storage/workspaces',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: PipelineQueueService,
    @Inject(PREVIEW_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async create(
    projectId: string,
    baseProjectVersionId: string,
    input: CreateDraftRevisionDto,
  ): Promise<DraftRevisionResponse> {
    const base = await this.prisma.projectVersion.findFirst({
      where: { id: baseProjectVersionId, projectId },
      include: { specification: true, preview: true },
    });
    if (!base) return this.notFound();
    if (base.specification?.status !== 'APPROVED' || !base.preview) {
      throw new ConflictException({
        code: 'REVISION_BASE_NOT_READY',
        message: 'A validated preview and approved specification are required.',
      });
    }
    this.assertTarget(base.specification.content as never, input);

    const { revision, job } = await this.prisma.$transaction(
      async (transaction) => {
        const job = await transaction.pipelineJob.create({
          data: {
            projectId,
            projectVersionId: baseProjectVersionId,
            type: 'TARGETED_REVISION',
            idempotencyKey: `targeted-revision-${crypto.randomUUID()}`,
            logs: {
              create: {
                sequence: 1,
                level: 'INFO',
                message: 'Targeted revision queued for isolated validation.',
              },
            },
          },
        });
        const revision = await transaction.draftRevision.create({
          data: {
            projectId,
            baseProjectVersionId,
            pipelineJobId: job.id,
            instruction: input.instruction,
            replacementText: input.replacementText,
            targetPageId: input.target.pageId,
            targetElementId: input.target.id,
            targetElementType: input.target.type,
            targetFile: input.target.file,
            targetLabel: input.target.label,
          },
        });
        return { revision, job };
      },
    );
    try {
      await this.queue.enqueueRevision({
        pipelineJobId: job.id,
        projectId,
        projectVersionId: baseProjectVersionId,
        versionNumber: base.versionNumber,
      });
    } catch {
      await this.prisma.$transaction([
        this.prisma.pipelineJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorCode: 'QUEUE_DISPATCH_FAILED',
            errorMessage: 'The revision could not be dispatched.',
          },
        }),
        this.prisma.draftRevision.update({
          where: { id: revision.id },
          data: {
            status: 'FAILED',
            errorMessage: 'The revision could not be dispatched.',
          },
        }),
      ]);
      throw new ServiceUnavailableException({
        code: 'QUEUE_UNAVAILABLE',
        message: 'The revision queue is temporarily unavailable.',
      });
    }
    return this.map(revision);
  }

  async list(
    projectId: string,
    baseProjectVersionId: string,
  ): Promise<DraftRevisionListResponse> {
    await this.assertVersion(projectId, baseProjectVersionId);
    const items = await this.prisma.draftRevision.findMany({
      where: { projectId, baseProjectVersionId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return { items: items.map((item) => this.map(item)) };
  }

  async get(
    projectId: string,
    revisionId: string,
  ): Promise<DraftRevisionResponse> {
    return this.map(await this.find(projectId, revisionId));
  }

  async discard(
    projectId: string,
    revisionId: string,
  ): Promise<DraftRevisionResponse> {
    const revision = await this.find(projectId, revisionId);
    if (['ACCEPTED', 'DISCARDED'].includes(revision.status)) {
      throw new ConflictException({
        code: 'REVISION_NOT_DISCARDABLE',
        message: 'The revision is already terminal.',
      });
    }
    const removed = await this.queue.removeIfPending(revision.pipelineJobId);
    const updated = await this.prisma.$transaction(async (transaction) => {
      const discarded = await transaction.draftRevision.update({
        where: { id: revision.id },
        data: { status: 'DISCARDED', errorMessage: null },
      });
      await transaction.pipelineJob.update({
        where: { id: revision.pipelineJobId },
        data: {
          status: removed ? 'CANCELLED' : 'CANCEL_REQUESTED',
          cancellationRequestedAt: new Date(),
          ...(removed ? { cancelledAt: new Date() } : {}),
        },
      });
      return discarded;
    });
    return this.map(updated);
  }

  async accept(
    projectId: string,
    revisionId: string,
    input: AcceptDraftRevisionDto,
  ): Promise<AcceptDraftRevisionResponse> {
    const accepted = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${projectId}::uuid FOR UPDATE`;
        const revision = await transaction.draftRevision.findFirst({
          where: { id: revisionId, projectId },
          include: { baseProjectVersion: true },
        });
        if (!revision) return this.notFound();
        if (
          revision.status !== 'READY' ||
          !revision.specificationContent ||
          !revision.previewStoragePrefix ||
          !revision.previewContentHash ||
          !revision.previewFileCount ||
          !revision.previewTotalBytes
        ) {
          throw new ConflictException({
            code: 'REVISION_NOT_READY',
            message: 'Only a validated draft revision can be accepted.',
          });
        }
        const latest = await transaction.projectVersion.findFirst({
          where: { projectId },
          select: { versionNumber: true },
          orderBy: { versionNumber: 'desc' },
        });
        const versionNumber = (latest?.versionNumber ?? 0) + 1;
        const version = await transaction.projectVersion.create({
          data: {
            projectId,
            versionNumber,
            label: input.label,
            sourceType: 'REVISION',
            instructionsSnapshot: `${revision.baseProjectVersion.instructionsSnapshot}\n\nRevision: ${revision.instruction}`,
            specification: {
              create: {
                projectId,
                status: 'APPROVED',
                approvedAt: new Date(),
                content: revision.specificationContent as never,
              },
            },
            preview: {
              create: {
                projectId,
                sourceJobId: revision.pipelineJobId,
                storagePrefix: revision.previewStoragePrefix,
                contentHash: revision.previewContentHash,
                fileCount: revision.previewFileCount,
                totalBytes: revision.previewTotalBytes,
              },
            },
          },
        });
        const target = await this.workspace.prepare(projectId, versionNumber);
        await this.workspace.replaceControlledDirectory(
          this.workspace.revisionSource(projectId, revision.id),
          target.source,
        );
        const updatedRevision = await transaction.draftRevision.update({
          where: { id: revision.id },
          data: {
            status: 'ACCEPTED',
            acceptedProjectVersionId: version.id,
          },
        });
        return { revision: updatedRevision, version };
      },
      { timeout: 15_000 },
    );
    return {
      revision: this.map(accepted.revision),
      version: this.mapVersion(accepted.version),
    };
  }

  async getPreviewFile(
    projectId: string,
    revisionId: string,
    rawPath: string | string[],
  ): Promise<RevisionPreviewFile> {
    const revision = await this.find(projectId, revisionId);
    if (
      !revision.previewStoragePrefix ||
      !['READY', 'ACCEPTED'].includes(revision.status)
    ) {
      return this.notFound();
    }
    const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
    this.assertPath(path);
    try {
      return {
        body: await this.storage.get(
          `${revision.previewStoragePrefix}/${path}`,
          10 * 1024 * 1024,
        ),
        contentType: this.contentType(path),
      };
    } catch {
      return this.notFound();
    }
  }

  private assertTarget(
    specification: UiSpecificationContent,
    input: CreateDraftRevisionDto,
  ): void {
    const match = input.target.id.match(/^(.*):component:(\d+)$/);
    const page = specification.pages.find(
      (item) => item.id === input.target.pageId,
    );
    const index = match ? Number(match[2]) : -1;
    if (
      !match ||
      match[1] !== input.target.pageId ||
      !page ||
      page.components[index] !== input.target.label
    ) {
      throw new ConflictException({
        code: 'REVISION_TARGET_STALE',
        message: 'The selected element no longer matches this version.',
      });
    }
  }

  private async assertVersion(
    projectId: string,
    versionId: string,
  ): Promise<void> {
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
      select: { id: true },
    });
    if (!version) return this.notFound();
  }

  private async find(
    projectId: string,
    revisionId: string,
  ): Promise<DraftRevision> {
    const revision = await this.prisma.draftRevision.findFirst({
      where: { id: revisionId, projectId },
    });
    if (!revision) return this.notFound();
    return revision;
  }

  private map(revision: DraftRevision): DraftRevisionResponse {
    return {
      id: revision.id,
      projectId: revision.projectId,
      baseProjectVersionId: revision.baseProjectVersionId,
      acceptedProjectVersionId: revision.acceptedProjectVersionId,
      pipelineJobId: revision.pipelineJobId,
      status: revision.status,
      instruction: revision.instruction,
      replacementText: revision.replacementText,
      target: {
        id: revision.targetElementId,
        type: revision.targetElementType,
        file: revision.targetFile,
        pageId: revision.targetPageId,
        label: revision.targetLabel,
      },
      previewEntryUrl: revision.previewStoragePrefix
        ? `/api/projects/${revision.projectId}/revisions/${revision.id}/preview/files/index.html`
        : null,
      errorMessage: revision.errorMessage,
      createdAt: revision.createdAt.toISOString(),
      updatedAt: revision.updatedAt.toISOString(),
    };
  }

  private mapVersion(version: ProjectVersion): ProjectVersionResponse {
    return {
      id: version.id,
      projectId: version.projectId,
      versionNumber: version.versionNumber,
      label: version.label,
      status: version.status,
      sourceType: version.sourceType,
      instructionsSnapshot: version.instructionsSnapshot,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private assertPath(path: string): void {
    if (
      !path ||
      path.startsWith('/') ||
      path.includes('..') ||
      path.includes('\\') ||
      !/^[a-zA-Z0-9/_\-.]+$/.test(path)
    ) {
      return this.notFound();
    }
  }

  private contentType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    return (
      {
        html: 'text/html; charset=utf-8',
        css: 'text/css; charset=utf-8',
        js: 'text/javascript; charset=utf-8',
        json: 'application/json; charset=utf-8',
        svg: 'image/svg+xml',
        png: 'image/png',
        webp: 'image/webp',
        woff2: 'font/woff2',
      }[extension ?? ''] ?? 'application/octet-stream'
    );
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'DRAFT_REVISION_NOT_FOUND',
      message: 'Draft revision not found.',
    });
  }
}
