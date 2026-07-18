import type { ProjectResponse, ProjectVersionResponse } from './projects';

describe('project contracts', () => {
  it('keeps projects and immutable versions distinct', () => {
    const project: ProjectResponse = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Example',
      description: null,
      status: 'ACTIVE',
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T00:00:00.000Z',
    };
    const version: ProjectVersionResponse = {
      id: '22222222-2222-4222-8222-222222222222',
      projectId: project.id,
      versionNumber: 1,
      label: 'Initial',
      status: 'DRAFT',
      sourceType: 'MANUAL',
      instructionsSnapshot: 'Create a dashboard.',
      createdAt: '2026-07-18T00:00:00.000Z',
    };

    expect(version.projectId).toBe(project.id);
    expect(version.versionNumber).toBe(1);
  });
});
