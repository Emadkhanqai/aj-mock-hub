import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '@aj-mock-hub/database';
import { ProjectsService } from './projects.service';

const createdAt = new Date('2026-07-18T00:00:00.000Z');
const project = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Example',
  description: null,
  status: 'ACTIVE' as const,
  createdAt,
  updatedAt: createdAt,
};
const version = {
  id: '22222222-2222-4222-8222-222222222222',
  projectId: project.id,
  versionNumber: 1,
  label: 'Initial',
  status: 'DRAFT' as const,
  sourceType: 'MANUAL' as const,
  instructionsSnapshot: 'Create a dashboard.',
  createdAt,
};

function createPrismaMock() {
  const transaction = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: project.id }]),
    projectVersion: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(version),
    },
  };
  return {
    project: {
      create: jest.fn().mockResolvedValue(project),
      findMany: jest.fn().mockResolvedValue([project]),
      findUnique: jest.fn().mockResolvedValue(project),
    },
    projectVersion: {
      findMany: jest.fn().mockResolvedValue([version]),
      findFirst: jest.fn().mockResolvedValue(version),
    },
    $transaction: jest.fn(async (callback) => callback(transaction)),
    transaction,
  };
}

describe('ProjectsService', () => {
  it('creates and maps a project', async () => {
    const prisma = createPrismaMock();
    const service = new ProjectsService(prisma as unknown as PrismaService);

    await expect(service.createProject({ name: 'Example' })).resolves.toEqual({
      ...project,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  });

  it('returns a project-not-found error', async () => {
    const prisma = createPrismaMock();
    prisma.project.findUnique.mockResolvedValueOnce(null);
    const service = new ProjectsService(prisma as unknown as PrismaService);

    await expect(service.getProject(project.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allocates the next version inside a transaction', async () => {
    const prisma = createPrismaMock();
    prisma.transaction.projectVersion.findFirst.mockResolvedValueOnce({
      versionNumber: 3,
    });
    prisma.transaction.projectVersion.create.mockResolvedValueOnce({
      ...version,
      versionNumber: 4,
    });
    const service = new ProjectsService(prisma as unknown as PrismaService);

    const result = await service.createVersion(project.id, {
      label: 'Revision',
      instructionsSnapshot: 'Keep the layout.',
    });

    expect(result.versionNumber).toBe(4);
    expect(prisma.transaction.projectVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: project.id,
        versionNumber: 4,
      }),
    });
  });

  it('does not return a version through another project', async () => {
    const prisma = createPrismaMock();
    prisma.projectVersion.findFirst.mockResolvedValueOnce(null);
    const service = new ProjectsService(prisma as unknown as PrismaService);

    await expect(
      service.getVersion('33333333-3333-4333-8333-333333333333', version.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
