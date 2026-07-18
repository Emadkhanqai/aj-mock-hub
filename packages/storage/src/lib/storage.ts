import { mkdir } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const SAFE_SEGMENT = /^[a-zA-Z0-9-]+$/;

export interface VersionWorkspace {
  root: string;
  source: string;
  logs: string;
}

export class WorkspaceService {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async prepare(
    projectId: string,
    versionNumber: number,
  ): Promise<VersionWorkspace> {
    this.assertSegment(projectId);
    if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) {
      throw new Error('Version number must be a positive integer');
    }

    const version = versionNumber.toString().padStart(3, '0');
    const workspaceRoot = this.safeResolve(projectId, 'versions', version);
    const workspace = {
      root: workspaceRoot,
      source: this.safeResolve(projectId, 'versions', version, 'source'),
      logs: this.safeResolve(projectId, 'versions', version, 'logs'),
    };
    await Promise.all([
      mkdir(workspace.source, { recursive: true }),
      mkdir(workspace.logs, { recursive: true }),
    ]);
    return workspace;
  }

  private assertSegment(segment: string): void {
    if (!SAFE_SEGMENT.test(segment)) {
      throw new Error('Workspace path segment is invalid');
    }
  }

  private safeResolve(...segments: string[]): string {
    segments.forEach((segment) => this.assertSegment(segment));
    const target = resolve(this.root, ...segments);
    if (target !== this.root && !target.startsWith(`${this.root}${sep}`)) {
      throw new Error('Workspace path escapes its configured root');
    }
    return target;
  }
}
