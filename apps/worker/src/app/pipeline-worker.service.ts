import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '@aj-mock-hub/database';
import { DockerBuildRunner } from '@aj-mock-hub/build-runner';
import type { UiSpecificationContent } from '@aj-mock-hub/contracts';
import {
  ISOLATED_BUILD_JOB,
  ANGULAR_GENERATION_JOB,
  PIPELINE_QUEUE_NAME,
  PipelineQueueData,
  pipelineWorkerOptions,
  TARGETED_REVISION_JOB,
} from '@aj-mock-hub/job-queue';
import {
  collectStaticFiles,
  MinioObjectStorage,
  type ObjectStorage,
  WorkspaceService,
} from '@aj-mock-hub/storage';
import { AngularProjectGenerator } from '@aj-mock-hub/generation';
import { Job, Worker } from 'bullmq';

@Injectable()
export class PipelineWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PipelineWorkerService.name);
  private readonly workspace = new WorkspaceService(
    process.env['WORKSPACE_ROOT'] ?? 'storage/workspaces',
  );
  private readonly buildRunner = new DockerBuildRunner({
    workspaceRoot: process.env['WORKSPACE_ROOT'] ?? 'storage/workspaces',
    image:
      process.env['ANGULAR_BUILDER_IMAGE'] ??
      'aj-mock-hub-angular-builder:node22-v1',
    timeoutMs: Number(process.env['BUILDER_TIMEOUT_MS'] ?? 300_000),
  });
  private readonly templateRoot =
    process.env['ANGULAR_TEMPLATE_ROOT'] ?? 'templates/angular-starter';
  private readonly generator = new AngularProjectGenerator();
  private readonly previewStorage = this.createPreviewStorage();
  private worker?: Worker<PipelineQueueData>;
  private connection?: ReturnType<typeof pipelineWorkerOptions>['connection'];

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    const redisUrl = process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379';
    const resources = pipelineWorkerOptions(redisUrl);
    this.connection = resources.connection;
    this.worker = new Worker<PipelineQueueData>(
      PIPELINE_QUEUE_NAME,
      (job) => this.process(job),
      resources.options,
    );
    this.worker.on('error', (error) =>
      this.logger.error('Pipeline worker error', error.stack),
    );
    this.logger.log('Pipeline worker connected and awaiting trusted jobs.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    this.connection?.disconnect();
  }

  private async process(job: Job<PipelineQueueData>): Promise<void> {
    if (
      ![
        ISOLATED_BUILD_JOB,
        ANGULAR_GENERATION_JOB,
        TARGETED_REVISION_JOB,
      ].includes(job.name)
    ) {
      throw new Error('Unsupported pipeline job type');
    }

    const record = await this.prisma.pipelineJob.findUnique({
      where: { id: job.data.pipelineJobId },
    });
    if (!record) {
      throw new Error('Pipeline job record is missing');
    }
    if (record.status === 'CANCEL_REQUESTED' || record.status === 'CANCELLED') {
      await this.finishCancelled(record.id);
      return;
    }
    if (record.status === 'COMPLETED') return;

    await this.prisma.pipelineJob.update({
      where: { id: record.id },
      data: {
        status: 'ACTIVE',
        attempts: { increment: 1 },
        startedAt: record.startedAt ?? new Date(),
        errorCode: null,
        errorMessage: null,
      },
    });
    await this.appendLog(
      record.id,
      'INFO',
      `Attempt ${job.attemptsMade + 1} started.`,
    );

    try {
      const revision =
        job.name === TARGETED_REVISION_JOB
          ? await this.prisma.draftRevision.findUnique({
              where: { pipelineJobId: record.id },
              include: {
                baseProjectVersion: { include: { specification: true } },
              },
            })
          : null;
      if (job.name === TARGETED_REVISION_JOB && !revision) {
        throw new Error('Draft revision record is missing');
      }
      if (revision?.status === 'DISCARDED') {
        await this.finishCancelled(record.id);
        return;
      }
      const workspace = revision
        ? await this.workspace.prepareRevision(job.data.projectId, revision.id)
        : await this.workspace.prepare(
            job.data.projectId,
            job.data.versionNumber,
          );
      if (revision) {
        await this.workspace.copyControlledDirectory(
          this.workspace.versionSource(
            job.data.projectId,
            revision.baseProjectVersion.versionNumber,
          ),
          workspace.source,
        );
        const specification = this.applyTargetedRevision(
          revision.baseProjectVersion.specification?.content as unknown as
            | UiSpecificationContent
            | undefined,
          revision,
        );
        const files = this.generator.generate(specification);
        await this.workspace.writeControlledFiles(workspace.source, files);
        await this.prisma.draftRevision.update({
          where: { id: revision.id },
          data: { specificationContent: specification as never },
        });
        await this.appendLog(
          record.id,
          'INFO',
          `Applied a controlled patch to ${revision.targetElementId}.`,
        );
      } else {
        await this.workspace.copyControlledTemplate(
          this.templateRoot,
          workspace.source,
        );
      }
      if (job.name === ANGULAR_GENERATION_JOB) {
        const specification = await this.prisma.uiSpecification.findFirst({
          where: {
            projectId: job.data.projectId,
            projectVersionId: job.data.projectVersionId,
            status: 'APPROVED',
          },
        });
        if (!specification) {
          throw new Error('Approved UI specification is required');
        }
        const files = this.generator.generate(specification.content as never);
        await this.workspace.writeControlledFiles(workspace.source, files);
        await this.appendLog(
          record.id,
          'INFO',
          `Generated ${files.length} controlled Angular project files.`,
        );
      }
      for (const command of ['lint', 'test', 'build'] as const) {
        const result = await this.buildRunner.run({
          jobId: record.id,
          workspacePath: workspace.source,
          command,
          ...(command === 'build'
            ? { outputPath: workspace.previewStaging }
            : {}),
        });
        await this.appendLog(
          record.id,
          result.exitCode === 0 ? 'INFO' : 'ERROR',
          this.formatDiagnostics(command, result),
        );
        if (result.exitCode !== 0) {
          throw new Error(`Isolated ${command} validation failed`);
        }
      }
      if (job.name === ANGULAR_GENERATION_JOB) {
        await this.publishPreview(
          record.id,
          job.data,
          workspace.previewStaging,
        );
      } else if (job.name === TARGETED_REVISION_JOB && revision) {
        await this.publishRevisionPreview(
          record.id,
          job.data,
          revision.id,
          workspace.previewStaging,
        );
      }
      const latest = await this.prisma.pipelineJob.findUniqueOrThrow({
        where: { id: record.id },
        select: { cancellationRequestedAt: true },
      });
      if (latest.cancellationRequestedAt) {
        await this.finishCancelled(record.id);
        return;
      }
      await this.prisma.pipelineJob.update({
        where: { id: record.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      await this.appendLog(
        record.id,
        'INFO',
        job.name === ANGULAR_GENERATION_JOB
          ? 'Angular generation, validation and preview publishing completed.'
          : job.name === TARGETED_REVISION_JOB
            ? 'Targeted revision validated and previewed without changing the accepted version.'
            : 'Workspace preparation completed.',
      );
    } catch (error: unknown) {
      const finalAttempt = job.attemptsMade + 1 >= record.maxAttempts;
      if (job.name === TARGETED_REVISION_JOB && finalAttempt) {
        await this.prisma.draftRevision.updateMany({
          where: { pipelineJobId: record.id, status: 'VALIDATING' },
          data: {
            status: 'FAILED',
            errorMessage: 'The targeted revision did not pass validation.',
          },
        });
      }
      await this.prisma.pipelineJob.update({
        where: { id: record.id },
        data: {
          status: finalAttempt ? 'FAILED' : 'RETRYING',
          ...(finalAttempt ? { failedAt: new Date() } : {}),
          errorCode:
            job.name === ANGULAR_GENERATION_JOB
              ? 'ANGULAR_GENERATION_FAILED'
              : job.name === TARGETED_REVISION_JOB
                ? 'TARGETED_REVISION_FAILED'
                : 'WORKSPACE_PREPARATION_FAILED',
          errorMessage:
            job.name === ANGULAR_GENERATION_JOB
              ? 'Angular generation failed.'
              : job.name === TARGETED_REVISION_JOB
                ? 'Targeted revision failed.'
                : 'Workspace preparation failed.',
        },
      });
      await this.appendLog(
        record.id,
        finalAttempt ? 'ERROR' : 'WARN',
        finalAttempt
          ? 'Workspace preparation failed after all attempts.'
          : 'Workspace preparation failed; a bounded retry is scheduled.',
      );
      this.logger.error(
        `Pipeline job ${record.id} failed`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private applyTargetedRevision(
    source: UiSpecificationContent | undefined,
    revision: {
      targetPageId: string;
      targetElementId: string;
      targetElementType: string;
      targetFile: string;
      replacementText: string;
      operation: string;
      textColor: string | null;
      backgroundColor: string | null;
      buttonLabel: string | null;
      themePreset: string | null;
    },
  ): UiSpecificationContent {
    if (!source) throw new Error('Approved UI specification is required');
    if (
      !['component', 'button'].includes(revision.targetElementType) ||
      revision.targetFile !== 'src/main.ts'
    ) {
      throw new Error('Revision target is not supported');
    }
    const match = revision.targetElementId.match(/^(.*):component:(\d+)$/);
    if (!match || match[1] !== revision.targetPageId) {
      throw new Error('Revision target identifier is invalid');
    }
    const componentIndex = Number(match[2]);
    let changed = false;
    const pages = source.pages.map((page) => {
      if (page.id !== revision.targetPageId) return page;
      if (!page.components[componentIndex]) {
        throw new Error('Revision target no longer exists');
      }
      const components = [...page.components];
      const componentKinds = Array.from(
        { length: components.length },
        (_, index) => page.componentKinds?.[index] ?? 'CARD',
      );
      const componentStyles = Array.from(
        { length: components.length },
        (_, index) => ({ ...(page.componentStyles?.[index] ?? {}) }),
      );
      switch (revision.operation) {
        case 'RENAME':
          components[componentIndex] = revision.replacementText;
          break;
        case 'RECOLOR':
          componentStyles[componentIndex] = {
            textColor: revision.textColor,
            backgroundColor: revision.backgroundColor,
          };
          break;
        case 'CLONE':
          if (components.length >= 50) {
            throw new Error('The page already has the maximum number of items');
          }
          components.push(components[componentIndex]);
          componentKinds.push(componentKinds[componentIndex]);
          componentStyles.push({ ...componentStyles[componentIndex] });
          break;
        case 'ADD_BUTTON':
          if (!revision.buttonLabel || components.length >= 50) {
            throw new Error('A button cannot be added to this page');
          }
          components.push(revision.buttonLabel);
          componentKinds.push('BUTTON');
          componentStyles.push({});
          break;
        case 'THEME':
          break;
        default:
          throw new Error('Revision operation is not supported');
      }
      changed = true;
      return {
        ...page,
        components,
        componentKinds,
        componentStyles,
      };
    });
    if (!changed) throw new Error('Revision target page does not exist');
    const themeColors: Record<string, string> = {
      AURORA: '#7cf6c3',
      MIDNIGHT: '#8fa7ff',
      PAPER: '#276749',
      SUNSET: '#ff8c69',
    };
    const themePreset = revision.themePreset as
      | 'AURORA'
      | 'MIDNIGHT'
      | 'PAPER'
      | 'SUNSET'
      | null;
    return {
      ...source,
      pages,
      ...(revision.operation === 'THEME' && themePreset
        ? {
            design: { themePreset },
            branding: {
              ...source.branding,
              primaryColor: themeColors[themePreset],
              tone: `${themePreset.toLowerCase()} visual theme`,
            },
          }
        : {}),
    };
  }

  private createPreviewStorage(): ObjectStorage {
    const accessKey = process.env['MINIO_ROOT_USER'];
    const secretKey = process.env['MINIO_ROOT_PASSWORD'];
    if (!accessKey || !secretKey) {
      const unavailable = async (): Promise<never> => {
        throw new Error(
          'MinIO credentials are required for preview publishing',
        );
      };
      return { put: unavailable, get: unavailable, delete: unavailable };
    }
    return new MinioObjectStorage({
      endpoint: process.env['MINIO_ENDPOINT'] ?? '127.0.0.1',
      port: Number(process.env['MINIO_API_PORT'] ?? 19000),
      useSsl: process.env['MINIO_USE_SSL'] === 'true',
      accessKey,
      secretKey,
      bucket: process.env['MINIO_PREVIEWS_BUCKET'] ?? 'previews',
    });
  }

  private async publishPreview(
    sourceJobId: string,
    data: PipelineQueueData,
    outputPath: string,
  ): Promise<void> {
    const existing = await this.prisma.staticPreview.findUnique({
      where: { projectVersionId: data.projectVersionId },
    });
    if (existing) return;
    const collection = await collectStaticFiles(outputPath);
    const prefix = `projects/${data.projectId}/versions/${data.versionNumber.toString().padStart(3, '0')}/previews/${sourceJobId}`;
    for (const file of collection.files) {
      await this.previewStorage.put(
        `${prefix}/${file.path}`,
        file.body,
        this.contentType(file.path),
      );
    }
    await this.prisma.staticPreview.create({
      data: {
        projectId: data.projectId,
        projectVersionId: data.projectVersionId,
        sourceJobId,
        storagePrefix: prefix,
        contentHash: collection.contentHash,
        fileCount: collection.files.length,
        totalBytes: collection.totalBytes,
      },
    });
    await this.appendLog(
      sourceJobId,
      'INFO',
      `Published ${collection.files.length} validated static preview files.`,
    );
  }

  private async publishRevisionPreview(
    sourceJobId: string,
    data: PipelineQueueData,
    revisionId: string,
    outputPath: string,
  ): Promise<void> {
    const revision = await this.prisma.draftRevision.findUniqueOrThrow({
      where: { id: revisionId },
      select: { status: true },
    });
    if (revision.status === 'DISCARDED') return;
    const collection = await collectStaticFiles(outputPath);
    const prefix = `projects/${data.projectId}/revisions/${revisionId}/previews/${sourceJobId}`;
    for (const file of collection.files) {
      await this.previewStorage.put(
        `${prefix}/${file.path}`,
        file.body,
        this.contentType(file.path),
      );
    }
    const updated = await this.prisma.draftRevision.updateMany({
      where: { id: revisionId, status: 'VALIDATING' },
      data: {
        status: 'READY',
        previewStoragePrefix: prefix,
        previewContentHash: collection.contentHash,
        previewFileCount: collection.files.length,
        previewTotalBytes: collection.totalBytes,
        errorMessage: null,
      },
    });
    if (updated.count === 0) return;
    await this.appendLog(
      sourceJobId,
      'INFO',
      `Published ${collection.files.length} validated draft preview files.`,
    );
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
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        ico: 'image/x-icon',
        woff: 'font/woff',
        woff2: 'font/woff2',
      }[extension ?? ''] ?? 'application/octet-stream'
    );
  }

  private async finishCancelled(jobId: string): Promise<void> {
    const updated = await this.prisma.pipelineJob.updateMany({
      where: { id: jobId, status: { not: 'CANCELLED' } },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (updated.count > 0) {
      await this.appendLog(
        jobId,
        'INFO',
        'Active job cancelled cooperatively.',
      );
    }
  }

  private async appendLog(
    jobId: string,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "pipeline_jobs" WHERE "id" = ${jobId}::uuid FOR UPDATE`;
      const latest = await transaction.pipelineJobLog.findFirst({
        where: { jobId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      });
      if ((latest?.sequence ?? 0) >= 500) return;
      await transaction.pipelineJobLog.create({
        data: { jobId, sequence: (latest?.sequence ?? 0) + 1, level, message },
      });
    });
  }

  private formatDiagnostics(
    command: 'lint' | 'test' | 'build',
    result: {
      exitCode: number;
      stdout: string;
      stderr: string;
      timedOut: boolean;
      durationMs: number;
    },
  ): string {
    const output = `${result.stdout}\n${result.stderr}`
      .replace(/\s+/g, ' ')
      .trim()
      .slice(-700);
    return [
      `${command} exited ${result.exitCode} in ${result.durationMs}ms`,
      result.timedOut ? '(timed out)' : '',
      output,
    ]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 1000);
  }
}
