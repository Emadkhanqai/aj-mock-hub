import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '@aj-mock-hub/database';
import { WorkspaceService } from '@aj-mock-hub/storage';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';

describe('Developer export integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const workspace = new WorkspaceService(
    process.env['WORKSPACE_ROOT'] ?? 'storage/workspaces',
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
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "projects" CASCADE');
  });

  afterAll(async () => app?.close());

  it('packages, downloads, audits and emails a clean immutable handoff', async () => {
    const project = await prisma.project.create({
      data: { name: 'Synthetic Finance' },
    });
    const version = await prisma.projectVersion.create({
      data: {
        projectId: project.id,
        versionNumber: 1,
        label: 'Approved',
        instructionsSnapshot: 'Create a synthetic dashboard.',
        specification: {
          create: {
            projectId: project.id,
            status: 'APPROVED',
            approvedAt: new Date(),
            content: { productSummary: 'Synthetic', pages: [] },
          },
        },
      },
    });
    const job = await prisma.pipelineJob.create({
      data: {
        projectId: project.id,
        projectVersionId: version.id,
        type: 'ANGULAR_GENERATION',
        status: 'COMPLETED',
        idempotencyKey: 'export-source',
      },
    });
    await prisma.staticPreview.create({
      data: {
        projectId: project.id,
        projectVersionId: version.id,
        sourceJobId: job.id,
        storagePrefix: `projects/${project.id}/preview`,
        contentHash: 'b'.repeat(64),
        fileCount: 1,
        totalBytes: 100,
      },
    });
    const source = await workspace.prepare(project.id, 1);
    await workspace.writeControlledFiles(
      source.source,
      [
        'README.md',
        'angular.json',
        'package-lock.json',
        'package.json',
        'tsconfig.json',
        'ui-specification.json',
      ].map((path) => ({ path, content: '{}' })),
    );
    await workspace.writeControlledFiles(source.source, [
      { path: 'src/main.ts', content: 'export {};' },
      { path: '.env', content: 'SECRET=never-export' },
      { path: 'dist/main.js', content: 'generated' },
    ]);

    const created = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/versions/${version.id}/exports`)
      .expect(201);
    expect(created.body).toMatchObject({
      fileName: 'synthetic-finance-v1.zip',
      downloadCount: 0,
    });

    const invalidLink = `${created.body.downloadUrl.slice(0, -1)}${created.body.downloadUrl.endsWith('0') ? '1' : '0'}`;
    await request(app.getHttpServer()).get(invalidLink).expect(404);

    const downloaded = await request(app.getHttpServer())
      .get(created.body.downloadUrl)
      .expect('Content-Type', /application\/zip/)
      .expect(200);
    expect(downloaded.headers['content-disposition']).toContain(
      'synthetic-finance-v1.zip',
    );
    expect(
      await prisma.exportDownloadAudit.count({
        where: { exportId: created.body.id },
      }),
    ).toBe(1);

    await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/exports/${created.body.id}/share`)
      .send({ email: 'developer@example.com' })
      .expect(201)
      .expect(({ body }) =>
        expect(body.recipient).toBe('developer@example.com'),
      );

    await expect(
      prisma.$executeRaw`UPDATE "developer_exports" SET "file_name" = 'changed.zip' WHERE "id" = ${created.body.id}::uuid`,
    ).rejects.toThrow('Developer exports are immutable');
  });
});
