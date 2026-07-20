import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@aj-mock-hub/database';
import { DeterministicRequirementsProvider } from '@aj-mock-hub/generation';
import type { ObjectStorage } from '@aj-mock-hub/storage';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';
import {
  OBJECT_STORAGE,
  REQUIREMENTS_PROVIDER,
} from './requirements.providers';

class MemoryObjectStorage implements ObjectStorage {
  readonly objects = new Map<string, Buffer>();

  async put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, body);
    return { key, size: body.length, contentType };
  }

  async get(key: string) {
    const value = this.objects.get(key);
    if (!value) throw new Error('Object not found');
    return value;
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}

describe('Requirements API integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(new MemoryObjectStorage())
      .overrideProvider(REQUIREMENTS_PROVIDER)
      .useValue(new DeterministicRequirementsProvider())
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "ui_specifications", "requirement_documents", "project_versions", "projects" CASCADE',
    );
  });

  afterAll(async () => app?.close());

  it('uploads requirements, extracts a draft, and permanently approves it', async () => {
    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Synthetic service portal' })
      .expect(201);
    const version = await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/versions`)
      .send({
        label: 'Initial requirements',
        instructionsSnapshot: 'Create a service request dashboard.',
      })
      .expect(201);

    const uploaded = await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/documents`,
      )
      .attach('file', Buffer.from('# Requirements\nTrack service requests.'), {
        filename: 'brief.md',
        contentType: 'text/markdown',
      })
      .expect(201)
      .expect(({ body }) => expect(body.status).toBe('UPLOADED'));

    const extracted = await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/ui-specification/extract`,
      )
      .send({})
      .expect(201);
    expect(extracted.body.status).toBe('DRAFT');

    const correctedContent = {
      ...extracted.body.content,
      productSummary: 'A corrected service request dashboard.',
      openQuestions: [],
    };
    const corrected = await request(app.getHttpServer())
      .put(
        `/api/projects/${project.body.id}/versions/${version.body.id}/ui-specification`,
      )
      .send({
        expectedUpdatedAt: extracted.body.updatedAt,
        content: correctedContent,
      })
      .expect(200);
    expect(corrected.body.content.productSummary).toContain('corrected');

    const approved = await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/ui-specification/approve`,
      )
      .send({ expectedUpdatedAt: corrected.body.updatedAt })
      .expect(201);
    expect(approved.body.status).toBe('APPROVED');

    await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/documents`,
      )
      .attach('file', Buffer.from('Late requirements'), {
        filename: 'late.md',
        contentType: 'text/markdown',
      })
      .expect(409)
      .expect(({ body }) =>
        expect(body.error.code).toBe('UI_SPECIFICATION_APPROVED'),
      );

    const generation = await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/generation-jobs`,
      )
      .send({ idempotencyKey: 'approved-generation' })
      .expect(201);
    expect(generation.body).toMatchObject({
      reused: false,
      job: { type: 'ANGULAR_GENERATION', status: 'QUEUED' },
    });

    await request(app.getHttpServer())
      .put(
        `/api/projects/${project.body.id}/versions/${version.body.id}/ui-specification`,
      )
      .send({
        expectedUpdatedAt: approved.body.updatedAt,
        content: correctedContent,
      })
      .expect(409)
      .expect(({ body }) =>
        expect(body.error.code).toBe('UI_SPECIFICATION_APPROVED'),
      );

    await expect(
      prisma.$executeRaw`UPDATE "ui_specifications" SET "content" = '{}'::jsonb WHERE "id" = ${approved.body.id}::uuid`,
    ).rejects.toThrow('approved UI specifications are immutable');
    await expect(
      prisma.$executeRaw`UPDATE "requirement_documents" SET "original_name" = 'changed.md' WHERE "id" = ${uploaded.body.id}::uuid`,
    ).rejects.toThrow(
      'documents for an approved UI specification are immutable',
    );
  });

  it('rejects executable uploads before storage', async () => {
    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Upload validation' })
      .expect(201);
    const version = await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/versions`)
      .send({ label: 'v1', instructionsSnapshot: 'Build it.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/documents`,
      )
      .attach('file', Buffer.from('console.log(1)'), {
        filename: 'payload.js',
        contentType: 'application/javascript',
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.error.code).toBe('DOCUMENT_TYPE_UNSUPPORTED'),
      );
  });

  it('accepts image sources and includes them in extraction', async () => {
    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Screenshot requirements' })
      .expect(201);
    const version = await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/versions`)
      .send({
        label: 'v1',
        instructionsSnapshot: 'Follow the supplied dashboard reference.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/documents`,
      )
      .attach('file', Buffer.from('synthetic-image'), {
        filename: 'dashboard.png',
        contentType: 'image/png',
      })
      .expect(201);

    const extracted = await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/ui-specification/extract`,
      )
      .send({})
      .expect(201);
    expect(extracted.body.content.assumptions).toContain(
      'Requirements include the uploaded image dashboard.png.',
    );

    await request(app.getHttpServer())
      .get(
        `/api/projects/${project.body.id}/versions/${version.body.id}/documents`,
      )
      .expect(200)
      .expect(({ body }) => expect(body.items[0].status).toBe('EXTRACTED'));
  });

  it('blocks approval while extraction has unresolved questions', async () => {
    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Conflicting requirements' })
      .expect(201);
    const version = await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/versions`)
      .send({ label: 'v1', instructionsSnapshot: 'Create a dashboard.' })
      .expect(201);
    const extracted = await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/ui-specification/extract`,
      )
      .send({})
      .expect(201);
    const withConflict = await request(app.getHttpServer())
      .put(
        `/api/projects/${project.body.id}/versions/${version.body.id}/ui-specification`,
      )
      .send({
        expectedUpdatedAt: extracted.body.updatedAt,
        content: {
          ...extracted.body.content,
          openQuestions: [
            'The instructions and dashboard.png specify different navigation patterns.',
          ],
        },
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/versions/${version.body.id}/ui-specification/approve`,
      )
      .send({ expectedUpdatedAt: withConflict.body.updatedAt })
      .expect(409)
      .expect(({ body }) =>
        expect(body.error.code).toBe('REQUIREMENTS_CLARIFICATION_REQUIRED'),
      );
  });
});
