import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '@aj-mock-hub/database';
import {
  PIPELINE_JOB_OPTIONS,
  WORKSPACE_PREPARATION_JOB,
  createPipelineQueue,
} from '@aj-mock-hub/job-queue';
import { PipelineWorkerService } from './pipeline-worker.service';

describe('Pipeline worker integration', () => {
  const prisma = new PrismaService();
  const queueResources = createPipelineQueue(
    process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  );
  const worker = new PipelineWorkerService(prisma);

  beforeAll(async () => {
    await prisma.$connect();
    worker.onModuleInit();
  });

  beforeEach(async () => {
    await queueResources.queue.obliterate({ force: true });
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "pipeline_job_logs", "pipeline_jobs", "project_versions", "projects" CASCADE',
    );
  });

  afterAll(async () => {
    await worker.onModuleDestroy();
    await queueResources.queue.close();
    queueResources.connection.disconnect();
    await prisma.$disconnect();
  });

  it('prepares a version workspace and persists lifecycle logs', async () => {
    const project = await prisma.project.create({
      data: { name: 'Worker integration' },
    });
    const version = await prisma.projectVersion.create({
      data: {
        projectId: project.id,
        versionNumber: 1,
        label: 'Initial',
        instructionsSnapshot: 'Prepare only trusted directories.',
      },
    });
    const pipelineJob = await prisma.pipelineJob.create({
      data: {
        projectId: project.id,
        projectVersionId: version.id,
        idempotencyKey: 'worker-integration',
        logs: {
          create: { sequence: 1, level: 'INFO', message: 'Job queued.' },
        },
      },
    });

    await queueResources.queue.add(
      WORKSPACE_PREPARATION_JOB,
      {
        pipelineJobId: pipelineJob.id,
        projectId: project.id,
        projectVersionId: version.id,
        versionNumber: 1,
      },
      { ...PIPELINE_JOB_OPTIONS, jobId: pipelineJob.id },
    );

    const completed = await waitForTerminalState(pipelineJob.id);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.attempts).toBe(1);
    expect(completed.logs.map((log) => log.message)).toEqual([
      'Job queued.',
      'Attempt 1 started.',
      'Workspace preparation completed.',
    ]);
    const workspaceRoot = process.env['WORKSPACE_ROOT'];
    if (!workspaceRoot) throw new Error('WORKSPACE_ROOT is required');
    const source = join(workspaceRoot, project.id, 'versions', '001', 'source');
    await expect(stat(source)).resolves.toMatchObject({});
  });

  it('honors a cooperative cancellation before work begins', async () => {
    const project = await prisma.project.create({
      data: { name: 'Cancelled worker integration' },
    });
    const version = await prisma.projectVersion.create({
      data: {
        projectId: project.id,
        versionNumber: 1,
        label: 'Initial',
        instructionsSnapshot: 'This work has been cancelled.',
      },
    });
    const pipelineJob = await prisma.pipelineJob.create({
      data: {
        projectId: project.id,
        projectVersionId: version.id,
        idempotencyKey: 'cancelled-worker-integration',
        status: 'CANCEL_REQUESTED',
        cancellationRequestedAt: new Date(),
        logs: {
          create: {
            sequence: 1,
            level: 'INFO',
            message: 'Cancellation requested for active job.',
          },
        },
      },
    });

    await queueResources.queue.add(
      WORKSPACE_PREPARATION_JOB,
      {
        pipelineJobId: pipelineJob.id,
        projectId: project.id,
        projectVersionId: version.id,
        versionNumber: 1,
      },
      { ...PIPELINE_JOB_OPTIONS, jobId: pipelineJob.id },
    );

    const cancelled = await waitForTerminalState(pipelineJob.id);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.attempts).toBe(0);
    expect(cancelled.logs[cancelled.logs.length - 1]?.message).toBe(
      'Active job cancelled cooperatively.',
    );
  });

  async function waitForTerminalState(jobId: string) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const job = await prisma.pipelineJob.findUniqueOrThrow({
        where: { id: jobId },
        include: { logs: { orderBy: { sequence: 'asc' } } },
      });
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) return job;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Timed out waiting for the pipeline worker');
  }
});
