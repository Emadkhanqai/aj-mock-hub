import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import JSZip from 'jszip';
import { createDeveloperExportArchive } from './developer-export';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ajmh-export-'));
  for (const name of [
    'README.md',
    'angular.json',
    'package-lock.json',
    'package.json',
    'tsconfig.json',
    'ui-specification.json',
  ]) {
    await writeFile(join(root, name), '{}');
  }
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src', 'main.ts'), 'export {};');
  return root;
}

describe('createDeveloperExportArchive', () => {
  it('adds handoff docs and excludes build output and secrets', async () => {
    const root = await fixture();
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist', 'main.js'), 'generated');
    await writeFile(join(root, '.env'), 'SECRET=value');
    await writeFile(join(root, '.env.local'), 'TOKEN=value');
    const archive = await createDeveloperExportArchive(root);
    const zip = await JSZip.loadAsync(archive.body);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        'README.md',
        '.env.example',
        'DESIGN_SYSTEM.md',
        'src/main.ts',
      ]),
    );
    expect(zip.file('.env')).toBeNull();
    expect(zip.file('.env.local')).toBeNull();
    expect(zip.file('dist/main.js')).toBeNull();
    const readme = zip.file('README.md');
    const packageJson = zip.file('package.json');
    if (!readme || !packageJson)
      throw new Error('Required handoff files missing');
    expect(await readme.async('string')).toContain('npm start');
    expect(JSON.parse(await packageJson.async('string')).scripts.start).toBe(
      'ng serve',
    );
  });

  it('rejects symbolic links', async () => {
    const root = await fixture();
    await symlink('/tmp', join(root, 'linked'));
    await expect(createDeveloperExportArchive(root)).rejects.toThrow(
      'symbolic links',
    );
  });
});
