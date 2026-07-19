import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

export const MAX_STATIC_PREVIEW_FILES = 500;
export const MAX_STATIC_PREVIEW_BYTES = 25 * 1024 * 1024;

export interface StaticFile {
  path: string;
  body: Buffer;
}

export interface StaticFileCollection {
  files: StaticFile[];
  contentHash: string;
  totalBytes: number;
}

export async function collectStaticFiles(
  root: string,
): Promise<StaticFileCollection> {
  const rootPath = resolve(root);
  const files: StaticFile[] = [];
  let totalBytes = 0;

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      if (!absolute.startsWith(`${rootPath}${sep}`)) {
        throw new Error('Static preview path escapes its configured root');
      }
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) {
        throw new Error('Static previews cannot contain symbolic links');
      }
      if (metadata.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!metadata.isFile()) continue;
      if (files.length >= MAX_STATIC_PREVIEW_FILES) {
        throw new Error('Static preview contains too many files');
      }
      totalBytes += metadata.size;
      if (totalBytes > MAX_STATIC_PREVIEW_BYTES) {
        throw new Error('Static preview exceeds its size limit');
      }
      const path = relative(rootPath, absolute).split(sep).join('/');
      files.push({ path, body: await readFile(absolute) });
    }
  }

  await visit(rootPath);
  files.sort((left, right) => left.path.localeCompare(right.path));
  if (!files.some((file) => file.path === 'index.html')) {
    throw new Error('Static preview is missing index.html');
  }
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.path);
    hash.update('\0');
    hash.update(file.body);
  }
  return { files, contentHash: hash.digest('hex'), totalBytes };
}
