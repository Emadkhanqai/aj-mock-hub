import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@aj-mock-hub/database';
import { createPipelineQueue } from '@aj-mock-hub/job-queue';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';

describe('Jobs API integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const queueResources = createPipelineQueue(
    process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await queueResources.queue.obliterate({ force: true });
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "pipeline_job_logs", "pipeline_jobs", "project_versions", "projects" CASCADE',
    );
  });

  afterAll(async () => {
    await app?.close();
    await queueResources.queue.close();
    queueResources.connection.disconnect();
  });

  it('enqueues idempotently, exposes logs, and cancels pending work', async () => {
    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Pipeline project' })
      .expect(201);
    const version = await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/versions`)
      .send({ label: 'Initial', instructionsSnapshot: 'Prepare a workspace.' })
      .expect(201);
    const endpoint = `/api/projects/${project.body.id}/versions/${version.body.id}/jobs`;

    const first = await request(app.getHttpServer())
      .post(endpoint)
      .send({ idempotencyKey: 'workspace-initial' })
      .expect(201);
    expect(first.body).toMatchObject({
      reused: false,
      job: { status: 'QUEUED' },
    });

    const duplicate = await request(app.getHttpServer())
      .post(endpoint)
      .send({ idempotencyKey: 'workspace-initial' })
      .expect(201);
    expect(duplicate.body.reused).toBe(true);
    expect(duplicate.body.job.id).toBe(first.body.job.id);

    await request(app.getHttpServer())
      .get(endpoint)
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));

    await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/jobs/${first.body.job.id}/cancel`)
      .expect(201)
      .expect(({ body }) => expect(body.status).toBe('CANCELLED'));

    await request(app.getHttpServer())
      .get(`/api/projects/${project.body.id}/jobs/${first.body.job.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.logs.map((log) => log.message)).toEqual([
          'Job queued.',
          'Queued job cancelled.',
        ]);
      });
  });

  it('validates idempotency keys and project-version ownership', async () => {
    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Validation project' })
      .expect(201);
    await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/00000000-0000-4000-8000-000000000001/jobs`,
      )
      .send({ idempotencyKey: '   ' })
      .expect(400);
    await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/00000000-0000-4000-8000-000000000001/jobs`,
      )
      .send({ idempotencyKey: 'valid-key' })
      .expect(404)
      .expect(({ body }) =>
        expect(body.error.code).toBe('PROJECT_VERSION_NOT_FOUND'),
      );
  });
});
