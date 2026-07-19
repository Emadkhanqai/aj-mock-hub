import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import JSZip from 'jszip';

export const MAX_EXPORT_FILES = 1_000;
export const MAX_EXPORT_SOURCE_BYTES = 50 * 1024 * 1024;

const EXCLUDED_SEGMENTS = new Set([
  '.angular',
  '.cache',
  '.git',
  'coverage',
  'dist',
  'exports',
  'logs',
  'node_modules',
  'preview-staging',
  'uploads',
]);

const REQUIRED_FILES = [
  'README.md',
  'angular.json',
  'package-lock.json',
  'package.json',
  'tsconfig.json',
  'ui-specification.json',
];

export interface DeveloperExportArchive {
  body: Buffer;
  contentHash: string;
  fileCount: number;
  sourceBytes: number;
}

export async function createDeveloperExportArchive(
  sourceRoot: string,
): Promise<DeveloperExportArchive> {
  const root = resolve(sourceRoot);
  const entries: Array<{ path: string; body: Buffer }> = [];
  let sourceBytes = 0;

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const lowerName = entry.name.toLowerCase();
      if (EXCLUDED_SEGMENTS.has(entry.name)) continue;
      if (
        lowerName === '.env' ||
        lowerName.startsWith('.env.') ||
        ['.npmrc', '.netrc', '.yarnrc', 'id_rsa', 'id_ed25519'].includes(
          lowerName,
        ) ||
        lowerName.endsWith('.log') ||
        lowerName.endsWith('.pem') ||
        lowerName.endsWith('.key')
      )
        continue;
      const absolute = resolve(directory, entry.name);
      if (!absolute.startsWith(`${root}${sep}`))
        throw new Error('Export path escapes its source root');
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink())
        throw new Error('Developer exports cannot contain symbolic links');
      if (metadata.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!metadata.isFile()) continue;
      if (entries.length >= MAX_EXPORT_FILES)
        throw new Error('Developer export contains too many files');
      sourceBytes += metadata.size;
      if (sourceBytes > MAX_EXPORT_SOURCE_BYTES)
        throw new Error('Developer export exceeds its source size limit');
      entries.push({
        path: relative(root, absolute).split(sep).join('/'),
        body: await readFile(absolute),
      });
    }
  }

  await visit(root);
  const packageEntry = entries.find((entry) => entry.path === 'package.json');
  if (packageEntry) {
    const packageJson = JSON.parse(packageEntry.body.toString('utf8')) as {
      scripts?: Record<string, string>;
    };
    packageJson.scripts = { ...packageJson.scripts, start: 'ng serve' };
    packageEntry.body = Buffer.from(
      `${JSON.stringify(packageJson, null, 2)}\n`,
    );
  }
  const readmeEntry = entries.find((entry) => entry.path === 'README.md');
  if (readmeEntry && !readmeEntry.body.toString('utf8').includes('npm start')) {
    readmeEntry.body = Buffer.concat([
      readmeEntry.body,
      Buffer.from('\n## Run locally\n\n```sh\nnpm start\n```\n'),
    ]);
  }
  const paths = new Set(entries.map((entry) => entry.path));
  for (const required of REQUIRED_FILES) {
    if (!paths.has(required))
      throw new Error(`Developer export is missing ${required}`);
  }
  entries.push(
    {
      path: '.env.example',
      body: Buffer.from('# Add application-specific non-secret values here.\n'),
    },
    {
      path: 'DESIGN_SYSTEM.md',
      body: Buffer.from(
        '# Design system\n\nDesign tokens and responsive styles are centralized in `src/styles.css`.\n',
      ),
    },
  );
  entries.sort((left, right) => left.path.localeCompare(right.path));
  const zip = new JSZip();
  const fixedDate = new Date('2000-01-01T00:00:00.000Z');
  for (const entry of entries)
    zip.file(entry.path, entry.body, { date: fixedDate });
  const body = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return {
    body,
    contentHash: createHash('sha256').update(body).digest('hex'),
    fileCount: entries.length,
    sourceBytes,
  };
}
