import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { StaticPreviewResponse } from '@aj-mock-hub/contracts';
import { PrismaService, type StaticPreview } from '@aj-mock-hub/database';
import type { ObjectStorage } from '@aj-mock-hub/storage';
import { PREVIEW_STORAGE } from './previews.providers';
import { injectPreviewRuntimeBridge } from './preview-runtime-bridge';

export interface PreviewFile {
  body: Buffer;
  contentType: string;
}

@Injectable()
export class PreviewsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PREVIEW_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async get(
    projectId: string,
    projectVersionId: string,
  ): Promise<StaticPreviewResponse> {
    const preview = await this.find(projectId, projectVersionId);
    return this.map(preview);
  }

  async getFile(
    projectId: string,
    projectVersionId: string,
    rawPath: string | string[],
  ): Promise<PreviewFile> {
    const preview = await this.find(projectId, projectVersionId);
    const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
    this.assertPath(path);
    try {
      const body = await this.storage.get(
        `${preview.storagePrefix}/${path}`,
        10 * 1024 * 1024,
      );
      return {
        body: injectPreviewRuntimeBridge(body, path),
        contentType: this.contentType(path),
      };
    } catch {
      throw new NotFoundException({
        code: 'PREVIEW_FILE_NOT_FOUND',
        message: 'Preview file not found.',
      });
    }
  }

  private async find(
    projectId: string,
    projectVersionId: string,
  ): Promise<StaticPreview> {
    const preview = await this.prisma.staticPreview.findFirst({
      where: { projectId, projectVersionId },
    });
    if (!preview) {
      throw new NotFoundException({
        code: 'STATIC_PREVIEW_NOT_FOUND',
        message: 'A validated static preview has not been published yet.',
      });
    }
    return preview;
  }

  private map(preview: StaticPreview): StaticPreviewResponse {
    return {
      id: preview.id,
      projectId: preview.projectId,
      projectVersionId: preview.projectVersionId,
      sourceJobId: preview.sourceJobId,
      entryUrl: `/api/projects/${preview.projectId}/versions/${preview.projectVersionId}/preview/files/${preview.entryFile}`,
      contentHash: preview.contentHash,
      fileCount: preview.fileCount,
      totalBytes: preview.totalBytes,
      publishedAt: preview.publishedAt.toISOString(),
    };
  }

  private assertPath(path: string): void {
    if (
      !path ||
      path.length > 500 ||
      path.startsWith('/') ||
      path.includes('..') ||
      path.includes('\\') ||
      !/^[a-zA-Z0-9/_\-.]+$/.test(path)
    ) {
      throw new NotFoundException({
        code: 'PREVIEW_FILE_NOT_FOUND',
        message: 'Preview file not found.',
      });
    }
  }

  private contentType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    return (
      {
        html: 'text/html; charset=utf-8',
        css: 'text/css; charset=utf-8',
        js: 'text/javascript; charset=utf-8',
        json: 'application/json; charset=utf-8',
        svg: 'image/svg+xml',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        ico: 'image/x-icon',
        woff: 'font/woff',
        woff2: 'font/woff2',
      }[extension ?? ''] ?? 'application/octet-stream'
    );
  }
}
