import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '@aj-mock-hub/database';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';

describe('Projects API integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "project_versions", "projects" CASCADE',
    );
  });

  afterAll(async () => app?.close());

  it('creates, lists, and retrieves a project', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: '  Support portal  ', description: '' })
      .expect(201);

    expect(created.body).toMatchObject({
      name: 'Support portal',
      description: null,
      status: 'ACTIVE',
    });
    await request(app.getHttpServer())
      .get('/api/projects')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
    await request(app.getHttpServer())
      .get(`/api/projects/${created.body.id}`)
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe(created.body.id));
  });

  it('validates requests and rejects unknown fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: '   ', unexpected: true })
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates sequential immutable versions under concurrency', async () => {
    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Concurrent project' })
      .expect(201);

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        request(app.getHttpServer())
          .post(`/api/projects/${project.body.id}/versions`)
          .send({
            label: `Revision ${index + 1}`,
            instructionsSnapshot: `Instructions ${index + 1}`,
          })
          .expect(201),
      ),
    );
    expect(responses.map(({ body }) => body.versionNumber).sort()).toEqual([
      1, 2, 3, 4, 5,
    ]);

    const versions = await request(app.getHttpServer())
      .get(`/api/projects/${project.body.id}/versions`)
      .expect(200);
    expect(versions.body.items.map((item) => item.versionNumber)).toEqual([
      5, 4, 3, 2, 1,
    ]);

    await expect(
      prisma.$executeRaw`UPDATE "project_versions" SET "label" = 'Changed' WHERE "id" = ${responses[0].body.id}::uuid`,
    ).rejects.toThrow('Accepted project versions are immutable');
  });

  it('does not expose a version through a different project', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'First' })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Second' })
      .expect(201);
    const version = await request(app.getHttpServer())
      .post(`/api/projects/${first.body.id}/versions`)
      .send({ label: 'Initial', instructionsSnapshot: 'Build it.' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/projects/${second.body.id}/versions/${version.body.id}`)
      .expect(404)
      .expect(({ body }) =>
        expect(body.error.code).toBe('PROJECT_VERSION_NOT_FOUND'),
      );
  });
});
