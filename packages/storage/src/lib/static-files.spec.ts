import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectStaticFiles } from './static-files';

describe('collectStaticFiles', () => {
  it('collects a deterministic bounded preview manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ajmh-preview-'));
    await mkdir(join(root, 'assets'));
    await writeFile(join(root, 'index.html'), '<main>Preview</main>');
    await writeFile(join(root, 'assets', 'main.js'), 'console.log("ok")');

    const result = await collectStaticFiles(root);

    expect(result.files.map((file) => file.path)).toEqual([
      'assets/main.js',
      'index.html',
    ]);
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.totalBytes).toBeGreaterThan(0);
  });

  it('rejects missing entry files and symbolic links', async () => {
    const missingEntry = await mkdtemp(join(tmpdir(), 'ajmh-preview-'));
    await writeFile(join(missingEntry, 'main.js'), '');
    await expect(collectStaticFiles(missingEntry)).rejects.toThrow(
      'missing index.html',
    );

    const linked = await mkdtemp(join(tmpdir(), 'ajmh-preview-'));
    await writeFile(join(linked, 'index.html'), 'ok');
    await symlink(join(linked, 'index.html'), join(linked, 'linked.html'));
    await expect(collectStaticFiles(linked)).rejects.toThrow('symbolic links');
  });
});
