import { NotFoundException } from '@nestjs/common';
import { PreviewsService } from './previews.service';

describe('PreviewsService', () => {
  const preview = {
    id: '11111111-1111-4111-8111-111111111111',
    projectId: '22222222-2222-4222-8222-222222222222',
    projectVersionId: '33333333-3333-4333-8333-333333333333',
    sourceJobId: '44444444-4444-4444-8444-444444444444',
    storagePrefix: 'projects/preview',
    entryFile: 'index.html',
    contentHash: 'a'.repeat(64),
    fileCount: 3,
    totalBytes: 1200,
    publishedAt: new Date('2026-07-19T00:00:00.000Z'),
  };
  const prisma = {
    staticPreview: { findFirst: jest.fn() },
  };
  const storage = {
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };
  const service = new PreviewsService(prisma as never, storage);

  beforeEach(() => jest.clearAllMocks());

  it('returns public metadata without exposing the storage key', async () => {
    prisma.staticPreview.findFirst.mockResolvedValue(preview);
    const result = await service.get(
      preview.projectId,
      preview.projectVersionId,
    );
    expect(result.entryUrl).toContain('/preview/files/index.html');
    expect(result).not.toHaveProperty('storagePrefix');
  });

  it('reads only safe version-scoped files', async () => {
    prisma.staticPreview.findFirst.mockResolvedValue(preview);
    storage.get.mockResolvedValue(Buffer.from('body'));
    const file = await service.getFile(
      preview.projectId,
      preview.projectVersionId,
      ['assets', 'main.js'],
    );
    expect(storage.get).toHaveBeenCalledWith(
      'projects/preview/assets/main.js',
      10 * 1024 * 1024,
    );
    expect(file.contentType).toContain('javascript');
    await expect(
      service.getFile(preview.projectId, preview.projectVersionId, '../secret'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adds the temporary editing bridge only to delivered HTML', async () => {
    prisma.staticPreview.findFirst.mockResolvedValue(preview);
    storage.get.mockResolvedValue(
      Buffer.from('<html><body>Validated preview</body></html>'),
    );

    const file = await service.getFile(
      preview.projectId,
      preview.projectVersionId,
      'index.html',
    );

    expect(file.body.toString()).toContain('data-ajmh-preview-bridge');
    expect(file.contentType).toContain('text/html');
  });
});
