import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

const SAFE_SEGMENT = /^[a-zA-Z0-9-]+$/;

export interface VersionWorkspace {
  root: string;
  source: string;
  logs: string;
  previewStaging: string;
}

export type RevisionWorkspace = VersionWorkspace;

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
      previewStaging: this.safeResolve(
        projectId,
        'versions',
        version,
        'preview-staging',
      ),
    };
    await rm(workspace.previewStaging, { recursive: true, force: true });
    await Promise.all([
      mkdir(workspace.source, { recursive: true }),
      mkdir(workspace.logs, { recursive: true }),
      mkdir(workspace.previewStaging, { recursive: true }),
    ]);
    return workspace;
  }

  versionSource(projectId: string, versionNumber: number): string {
    this.assertSegment(projectId);
    if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) {
      throw new Error('Version number must be a positive integer');
    }
    return this.safeResolve(
      projectId,
      'versions',
      versionNumber.toString().padStart(3, '0'),
      'source',
    );
  }

  revisionSource(projectId: string, revisionId: string): string {
    this.assertSegment(projectId);
    this.assertSegment(revisionId);
    return this.safeResolve(projectId, 'revisions', revisionId, 'source');
  }

  async prepareRevision(
    projectId: string,
    revisionId: string,
  ): Promise<RevisionWorkspace> {
    this.assertSegment(projectId);
    this.assertSegment(revisionId);
    const root = this.safeResolve(projectId, 'revisions', revisionId);
    await rm(root, { recursive: true, force: true });
    const workspace = {
      root,
      source: this.safeResolve(projectId, 'revisions', revisionId, 'source'),
      logs: this.safeResolve(projectId, 'revisions', revisionId, 'logs'),
      previewStaging: this.safeResolve(
        projectId,
        'revisions',
        revisionId,
        'preview-staging',
      ),
    };
    await Promise.all([
      mkdir(workspace.source, { recursive: true }),
      mkdir(workspace.logs, { recursive: true }),
      mkdir(workspace.previewStaging, { recursive: true }),
    ]);
    return workspace;
  }

  async copyControlledDirectory(
    source: string,
    destination: string,
  ): Promise<void> {
    const sourceRoot = resolve(source);
    const destinationRoot = resolve(destination);
    for (const path of [sourceRoot, destinationRoot]) {
      if (!path.startsWith(`${this.root}${sep}`)) {
        throw new Error('Workspace copy escapes its configured root');
      }
    }
    await this.copyDirectory(sourceRoot, destinationRoot);
  }

  async replaceControlledDirectory(
    source: string,
    destination: string,
  ): Promise<void> {
    const destinationRoot = resolve(destination);
    if (!destinationRoot.startsWith(`${this.root}${sep}`)) {
      throw new Error('Workspace replacement escapes its configured root');
    }
    await rm(destinationRoot, { recursive: true, force: true });
    await this.copyControlledDirectory(source, destinationRoot);
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

  async writeControlledFiles(
    destination: string,
    files: ReadonlyArray<{ path: string; content: string }>,
  ): Promise<void> {
    const targetRoot = resolve(destination);
    if (!targetRoot.startsWith(`${this.root}${sep}`)) {
      throw new Error('File destination escapes its configured root');
    }
    for (const file of files) {
      if (
        !file.path ||
        file.path.startsWith('/') ||
        file.path.includes('..') ||
        file.path.includes('\\')
      ) {
        throw new Error('Controlled file path is invalid');
      }
      const target = resolve(targetRoot, file.path);
      if (!target.startsWith(`${targetRoot}${sep}`)) {
        throw new Error('Controlled file path escapes its destination');
      }
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, { encoding: 'utf8', flag: 'w' });
    }
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
