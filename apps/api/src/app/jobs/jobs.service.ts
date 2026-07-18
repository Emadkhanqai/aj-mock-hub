import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  CreatePipelineJobResponse,
  PipelineJobDetailResponse,
  PipelineJobListResponse,
  PipelineJobLogResponse,
  PipelineJobResponse,
} from '@aj-mock-hub/contracts';
import {
  PrismaService,
  type PipelineJob,
  type PipelineJobLog,
} from '@aj-mock-hub/database';
import { CreatePipelineJobDto } from './dto/create-pipeline-job.dto';
import { PipelineQueueService } from './pipeline-queue.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: PipelineQueueService,
  ) {}

  async create(
    projectId: string,
    projectVersionId: string,
    input: CreatePipelineJobDto,
  ): Promise<CreatePipelineJobResponse> {
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: projectVersionId, projectId },
      select: { id: true, versionNumber: true },
    });
    if (!version) return this.versionNotFound();

    let reused = false;
    let pipelineJob: PipelineJob;
    try {
      pipelineJob = await this.prisma.pipelineJob.create({
        data: {
          projectId,
          projectVersionId,
          idempotencyKey: input.idempotencyKey,
          logs: {
            create: { sequence: 1, level: 'INFO', message: 'Job queued.' },
          },
        },
      });
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) throw error;
      reused = true;
      pipelineJob = await this.prisma.pipelineJob.findUniqueOrThrow({
        where: {
          projectVersionId_idempotencyKey: {
            projectVersionId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
    }

    if (!reused || pipelineJob.errorCode === 'QUEUE_DISPATCH_FAILED') {
      try {
        await this.queue.enqueue({
          pipelineJobId: pipelineJob.id,
          projectId,
          projectVersionId,
          versionNumber: version.versionNumber,
        });
        if (pipelineJob.errorCode === 'QUEUE_DISPATCH_FAILED') {
          pipelineJob = await this.prisma.pipelineJob.update({
            where: { id: pipelineJob.id },
            data: {
              status: 'QUEUED',
              errorCode: null,
              errorMessage: null,
              failedAt: null,
            },
          });
        }
      } catch {
        await this.prisma.pipelineJob.update({
          where: { id: pipelineJob.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorCode: 'QUEUE_DISPATCH_FAILED',
            errorMessage:
              'The job could not be dispatched to the worker queue.',
          },
        });
        throw new ServiceUnavailableException({
          code: 'QUEUE_UNAVAILABLE',
          message:
            'The job queue is temporarily unavailable. Retry with the same idempotency key.',
        });
      }
    }

    return { job: this.mapJob(pipelineJob), reused };
  }

  async list(
    projectId: string,
    projectVersionId: string,
  ): Promise<PipelineJobListResponse> {
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: projectVersionId, projectId },
      select: { id: true },
    });
    if (!version) return this.versionNotFound();
    const items = await this.prisma.pipelineJob.findMany({
      where: { projectId, projectVersionId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return { items: items.map((job) => this.mapJob(job)) };
  }

  async get(
    projectId: string,
    jobId: string,
  ): Promise<PipelineJobDetailResponse> {
    const job = await this.prisma.pipelineJob.findFirst({
      where: { id: jobId, projectId },
      include: { logs: { orderBy: { sequence: 'asc' }, take: 500 } },
    });
    if (!job) return this.jobNotFound();
    return {
      ...this.mapJob(job),
      logs: job.logs.map((log) => this.mapLog(log)),
    };
  }

  async cancel(projectId: string, jobId: string): Promise<PipelineJobResponse> {
    const current = await this.prisma.pipelineJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!current) return this.jobNotFound();
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(current.status)) {
      throw new ConflictException({
        code: 'PIPELINE_JOB_NOT_CANCELLABLE',
        message: 'A terminal job cannot be cancelled.',
      });
    }

    const pending = await this.queue.removeIfPending(jobId);
    const status = pending ? 'CANCELLED' : 'CANCEL_REQUESTED';
    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "pipeline_jobs" WHERE "id" = ${jobId}::uuid FOR UPDATE`;
      const locked = await transaction.pipelineJob.findUniqueOrThrow({
        where: { id: jobId },
      });
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(locked.status)) {
        throw new ConflictException({
          code: 'PIPELINE_JOB_NOT_CANCELLABLE',
          message: 'A terminal job cannot be cancelled.',
        });
      }
      const latest = await transaction.pipelineJobLog.findFirst({
        where: { jobId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      });
      const job = await transaction.pipelineJob.update({
        where: { id: jobId },
        data: {
          status,
          cancellationRequestedAt: new Date(),
          ...(pending ? { cancelledAt: new Date() } : {}),
        },
      });
      await transaction.pipelineJobLog.create({
        data: {
          jobId,
          sequence: (latest?.sequence ?? 0) + 1,
          level: 'INFO',
          message: pending
            ? 'Queued job cancelled.'
            : 'Cancellation requested for active job.',
        },
      });
      return job;
    });
    return this.mapJob(updated);
  }

  private mapJob(job: PipelineJob): PipelineJobResponse {
    return {
      id: job.id,
      projectId: job.projectId,
      projectVersionId: job.projectVersionId,
      type: job.type,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      cancellationRequestedAt:
        job.cancellationRequestedAt?.toISOString() ?? null,
      cancelledAt: job.cancelledAt?.toISOString() ?? null,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      failedAt: job.failedAt?.toISOString() ?? null,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  private mapLog(log: PipelineJobLog): PipelineJobLogResponse {
    return {
      id: log.id,
      sequence: log.sequence,
      level: log.level,
      message: log.message,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private versionNotFound(): never {
    throw new NotFoundException({
      code: 'PROJECT_VERSION_NOT_FOUND',
      message: 'Project version not found.',
    });
  }

  private jobNotFound(): never {
    throw new NotFoundException({
      code: 'PIPELINE_JOB_NOT_FOUND',
      message: 'Pipeline job not found.',
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
