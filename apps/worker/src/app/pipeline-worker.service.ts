import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '@aj-mock-hub/database';
import {
  PIPELINE_QUEUE_NAME,
  PipelineQueueData,
  WORKSPACE_PREPARATION_JOB,
  pipelineWorkerOptions,
} from '@aj-mock-hub/job-queue';
import { WorkspaceService } from '@aj-mock-hub/storage';
import { Job, Worker } from 'bullmq';

@Injectable()
export class PipelineWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PipelineWorkerService.name);
  private readonly workspace = new WorkspaceService(
    process.env['WORKSPACE_ROOT'] ?? 'storage/workspaces',
  );
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
    if (job.name !== WORKSPACE_PREPARATION_JOB) {
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
      await this.workspace.prepare(job.data.projectId, job.data.versionNumber);
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
        'Workspace preparation completed.',
      );
    } catch (error: unknown) {
      const finalAttempt = job.attemptsMade + 1 >= record.maxAttempts;
      await this.prisma.pipelineJob.update({
        where: { id: record.id },
        data: {
          status: finalAttempt ? 'FAILED' : 'RETRYING',
          ...(finalAttempt ? { failedAt: new Date() } : {}),
          errorCode: 'WORKSPACE_PREPARATION_FAILED',
          errorMessage: 'Workspace preparation failed.',
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
}
