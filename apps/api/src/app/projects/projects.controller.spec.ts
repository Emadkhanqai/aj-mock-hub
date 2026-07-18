import { Test } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  it('delegates project creation to the service', async () => {
    const project = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Example',
      description: null,
      status: 'ACTIVE' as const,
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T00:00:00.000Z',
    };
    const service = { createProject: jest.fn().mockResolvedValue(project) };
    const module = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    }).compile();

    const controller = module.get(ProjectsController);
    await expect(controller.createProject({ name: 'Example' })).resolves.toBe(
      project,
    );
    expect(service.createProject).toHaveBeenCalledWith({ name: 'Example' });
  });
});
