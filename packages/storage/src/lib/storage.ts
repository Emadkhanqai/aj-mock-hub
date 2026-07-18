import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises';
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

  async copyControlledTemplate(
    templateRoot: string,
    destination: string,
  ): Promise<void> {
    const target = resolve(destination);
    if (!target.startsWith(`${this.root}${sep}`)) {
      throw new Error('Template destination escapes its configured root');
    }
    await this.copyDirectory(resolve(templateRoot), target);
  }

  private async copyDirectory(
    source: string,
    destination: string,
  ): Promise<void> {
    await mkdir(destination, { recursive: true });
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (
        ['node_modules', 'dist', '.angular', 'coverage'].includes(entry.name)
      ) {
        continue;
      }
      const sourcePath = resolve(source, entry.name);
      const destinationPath = resolve(destination, entry.name);
      const metadata = await lstat(sourcePath);
      if (metadata.isSymbolicLink()) {
        throw new Error('Controlled templates cannot contain symbolic links');
      }
      if (metadata.isDirectory()) {
        await this.copyDirectory(sourcePath, destinationPath);
      } else if (metadata.isFile()) {
        await copyFile(sourcePath, destinationPath);
      }
    }
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
