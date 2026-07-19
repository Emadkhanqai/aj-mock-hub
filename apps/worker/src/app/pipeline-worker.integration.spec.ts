import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '@aj-mock-hub/database';
import {
  PIPELINE_JOB_OPTIONS,
  ISOLATED_BUILD_JOB,
  ANGULAR_GENERATION_JOB,
  TARGETED_REVISION_JOB,
  createPipelineQueue,
} from '@aj-mock-hub/job-queue';
import { PipelineWorkerService } from './pipeline-worker.service';

jest.setTimeout(60_000);

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
        type: 'ISOLATED_BUILD',
        idempotencyKey: 'worker-integration',
        logs: {
          create: { sequence: 1, level: 'INFO', message: 'Job queued.' },
        },
      },
    });

    await queueResources.queue.add(
      ISOLATED_BUILD_JOB,
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
    expect(completed.logs.map((log) => log.message)).toEqual(
      expect.arrayContaining([
        'Job queued.',
        'Attempt 1 started.',
        expect.stringContaining('lint exited 0'),
        expect.stringContaining('test exited 0'),
        expect.stringContaining('build exited 0'),
        'Workspace preparation completed.',
      ]),
    );
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
        type: 'ISOLATED_BUILD',
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
      ISOLATED_BUILD_JOB,
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

  it('generates controlled Angular files from an approved specification', async () => {
    const project = await prisma.project.create({
      data: { name: 'Generated worker integration' },
    });
    const version = await prisma.projectVersion.create({
      data: {
        projectId: project.id,
        versionNumber: 1,
        label: 'Approved plan',
        instructionsSnapshot: 'Create a service dashboard.',
      },
    });
    await prisma.uiSpecification.create({
      data: {
        projectId: project.id,
        projectVersionId: version.id,
        status: 'APPROVED',
        approvedAt: new Date(),
        content: {
          productSummary: 'Synthetic service dashboard',
          audiences: ['Service agents'],
          roles: ['Agent'],
          pages: [
            {
              id: 'dashboard',
              name: 'Dashboard',
              route: '/',
              purpose: 'Summarize service demand.',
              components: ['Service overview', 'Request queue'],
              dataNeeds: ['Synthetic requests'],
            },
          ],
          workflows: [],
          navigation: {
            pattern: 'SIDEBAR',
            items: [{ label: 'Dashboard', route: '/' }],
          },
          branding: {
            tone: 'Professional',
            primaryColor: null,
            accessibilityNotes: ['Visible focus states'],
          },
          assumptions: [],
          openQuestions: [],
        },
      },
    });
    const pipelineJob = await prisma.pipelineJob.create({
      data: {
        projectId: project.id,
        projectVersionId: version.id,
        type: 'ANGULAR_GENERATION',
        idempotencyKey: 'generation-integration',
        logs: {
          create: {
            sequence: 1,
            level: 'INFO',
            message: 'Angular generation job queued.',
          },
        },
      },
    });

    await queueResources.queue.add(
      ANGULAR_GENERATION_JOB,
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
    expect(completed.logs.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        'Generated 5 controlled Angular project files.',
        'Angular generation, validation and preview publishing completed.',
      ]),
    );
    const workspaceRoot = process.env['WORKSPACE_ROOT'];
    if (!workspaceRoot) throw new Error('WORKSPACE_ROOT is required');
    const source = join(workspaceRoot, project.id, 'versions', '001', 'source');
    await expect(
      readFile(join(source, 'src', 'main.ts'), 'utf8'),
    ).resolves.toContain('Synthetic service dashboard');
    await expect(
      readFile(join(source, 'ui-specification.json'), 'utf8'),
    ).resolves.toContain('"dashboard"');
    const preview = await prisma.staticPreview.findUnique({
      where: { projectVersionId: version.id },
    });
    expect(preview).toMatchObject({
      sourceJobId: pipelineJob.id,
      entryFile: 'index.html',
    });
    expect(preview?.fileCount).toBeGreaterThan(0);

    const revisionJob = await prisma.pipelineJob.create({
      data: {
        projectId: project.id,
        projectVersionId: version.id,
        type: 'TARGETED_REVISION',
        idempotencyKey: 'revision-integration',
        logs: {
          create: {
            sequence: 1,
            level: 'INFO',
            message: 'Targeted revision queued for isolated validation.',
          },
        },
      },
    });
    const revision = await prisma.draftRevision.create({
      data: {
        projectId: project.id,
        baseProjectVersionId: version.id,
        pipelineJobId: revisionJob.id,
        instruction: 'Rename the first dashboard component.',
        replacementText: 'Operations overview',
        targetPageId: 'dashboard',
        targetElementId: 'dashboard:component:0',
        targetElementType: 'component',
        targetFile: 'src/main.ts',
        targetLabel: 'Service overview',
      },
    });
    await queueResources.queue.add(
      TARGETED_REVISION_JOB,
      {
        pipelineJobId: revisionJob.id,
        projectId: project.id,
        projectVersionId: version.id,
        versionNumber: 1,
      },
      { ...PIPELINE_JOB_OPTIONS, jobId: revisionJob.id },
    );

    const revisedJob = await waitForTerminalState(revisionJob.id);
    expect(revisedJob.status).toBe('COMPLETED');
    const readyRevision = await prisma.draftRevision.findUniqueOrThrow({
      where: { id: revision.id },
    });
    expect(readyRevision.status).toBe('READY');
    expect(readyRevision.previewStoragePrefix).toContain(revision.id);
    const revisionSource = join(
      workspaceRoot,
      project.id,
      'revisions',
      revision.id,
      'source',
    );
    await expect(
      readFile(join(revisionSource, 'src', 'main.ts'), 'utf8'),
    ).resolves.toContain('Operations overview');
  });

  async function waitForTerminalState(jobId: string) {
    for (let attempt = 0; attempt < 600; attempt += 1) {
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
