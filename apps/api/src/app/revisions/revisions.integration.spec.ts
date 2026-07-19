import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '@aj-mock-hub/database';
import { WorkspaceService } from '@aj-mock-hub/storage';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';

describe('Revision acceptance integration', () => {
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

  it('accepts a validated draft only by creating a new immutable version', async () => {
    const project = await prisma.project.create({
      data: { name: 'Revision flow' },
    });
    const base = await prisma.projectVersion.create({
      data: {
        projectId: project.id,
        versionNumber: 1,
        label: 'Accepted base',
        instructionsSnapshot: 'Create a dashboard.',
      },
    });
    const job = await prisma.pipelineJob.create({
      data: {
        projectId: project.id,
        projectVersionId: base.id,
        type: 'TARGETED_REVISION',
        status: 'COMPLETED',
        idempotencyKey: 'accepted-revision-integration',
      },
    });
    const specification = {
      productSummary: 'Synthetic dashboard',
      audiences: [],
      roles: [],
      pages: [
        {
          id: 'home',
          name: 'Home',
          route: '/',
          purpose: 'Show activity.',
          components: ['Activity overview'],
          dataNeeds: [],
        },
      ],
      workflows: [],
      navigation: {
        pattern: 'SIDEBAR',
        items: [{ label: 'Home', route: '/' }],
      },
      branding: {
        tone: 'Professional',
        primaryColor: null,
        accessibilityNotes: [],
      },
      assumptions: [],
      openQuestions: [],
    } as const;
    const revision = await prisma.draftRevision.create({
      data: {
        projectId: project.id,
        baseProjectVersionId: base.id,
        pipelineJobId: job.id,
        status: 'READY',
        instruction: 'Rename the activity card.',
        replacementText: 'Activity overview',
        targetPageId: 'home',
        targetElementId: 'home:component:0',
        targetElementType: 'component',
        targetFile: 'src/main.ts',
        targetLabel: 'Overview',
        specificationContent: specification,
        previewStoragePrefix: `projects/${project.id}/revisions/draft`,
        previewContentHash: 'a'.repeat(64),
        previewFileCount: 3,
        previewTotalBytes: 1200,
      },
    });
    const source = await workspace.prepareRevision(project.id, revision.id);
    await workspace.writeControlledFiles(source.source, [
      { path: 'src/main.ts', content: 'const validated = true;' },
    ]);

    const response = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/revisions/${revision.id}/accept`)
      .send({ label: 'Accepted activity revision' })
      .expect(201);

    expect(response.body.version).toMatchObject({
      versionNumber: 2,
      sourceType: 'REVISION',
      label: 'Accepted activity revision',
    });
    expect(response.body.revision).toMatchObject({
      status: 'ACCEPTED',
      acceptedProjectVersionId: response.body.version.id,
    });
    await expect(
      prisma.$executeRaw`UPDATE "project_versions" SET "label" = 'Changed' WHERE "id" = ${response.body.version.id}::uuid`,
    ).rejects.toThrow('Accepted project versions are immutable');

    await request(app.getHttpServer())
      .get(
        `/api/projects/${project.id}/versions/${base.id}/compare/${response.body.version.id}`,
      )
      .expect(200)
      .expect(({ body }) => {
        expect(body.instructionsChanged).toBe(true);
        expect(body.pages.added).toEqual(['home']);
      });

    await request(app.getHttpServer())
      .post(
        `/api/projects/${project.id}/versions/${response.body.version.id}/duplicate`,
      )
      .send({ label: 'Safe copy' })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          versionNumber: 3,
          sourceType: 'DUPLICATE',
        }),
      );

    await request(app.getHttpServer())
      .post(
        `/api/projects/${project.id}/versions/${response.body.version.id}/restore`,
      )
      .send({ label: 'Restored snapshot' })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          versionNumber: 4,
          sourceType: 'RESTORE',
        }),
      );
  });
});
