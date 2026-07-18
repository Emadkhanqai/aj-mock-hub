import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceService } from './storage';

describe('WorkspaceService', () => {
  it('prepares a version-scoped workspace beneath the configured root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aj-mock-hub-workspace-'));
    const workspace = await new WorkspaceService(root).prepare('project-id', 2);
    expect(workspace.root).toBe(join(root, 'project-id', 'versions', '002'));
    await expect(stat(workspace.source)).resolves.toMatchObject({});
    await expect(stat(workspace.logs)).resolves.toMatchObject({});
  });

  it('rejects path traversal and invalid version numbers', async () => {
    const service = new WorkspaceService('/tmp/aj-mock-hub-test');
    await expect(service.prepare('../escape', 1)).rejects.toThrow('invalid');
    await expect(service.prepare('project-id', 0)).rejects.toThrow('positive');
  });

  it('copies controlled template files while excluding generated directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aj-mock-hub-workspace-'));
    const template = await mkdtemp(join(tmpdir(), 'aj-mock-hub-template-'));
    await writeFile(join(template, 'package.json'), '{"private":true}');
    const service = new WorkspaceService(root);
    const workspace = await service.prepare('project-id', 1);
    await service.copyControlledTemplate(template, workspace.source);
    await expect(
      readFile(join(workspace.source, 'package.json'), 'utf8'),
    ).resolves.toBe('{"private":true}');
  });
});
