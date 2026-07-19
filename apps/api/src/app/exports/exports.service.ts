import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  DeveloperExportListResponse,
  DeveloperExportResponse,
  ShareDeveloperExportResponse,
} from '@aj-mock-hub/contracts';
import { PrismaService, type DeveloperExport } from '@aj-mock-hub/database';
import {
  createDeveloperExportArchive,
  type ObjectStorage,
  WorkspaceService,
} from '@aj-mock-hub/storage';
import nodemailer from 'nodemailer';
import { EXPORT_STORAGE } from './exports.providers';

const MAX_ZIP_BYTES = 100 * 1024 * 1024;

@Injectable()
export class ExportsService {
  private readonly workspace = new WorkspaceService(
    process.env['WORKSPACE_ROOT'] ?? 'storage/workspaces',
  );
  private readonly signingSecret = process.env['EXPORT_SIGNING_SECRET'] ?? '';
  private readonly ttlSeconds = Number(
    process.env['EXPORT_LINK_TTL_SECONDS'] ?? 86_400,
  );
  private readonly mail = nodemailer.createTransport({
    host: process.env['SMTP_HOST'] ?? '127.0.0.1',
    port: Number(process.env['SMTP_PORT'] ?? 1025),
    secure: false,
  });

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EXPORT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async create(
    projectId: string,
    versionId: string,
  ): Promise<DeveloperExportResponse> {
    this.assertConfiguration();
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
      include: { project: true, preview: true, specification: true },
    });
    if (!version) return this.notFound();
    if (!version.preview || version.specification?.status !== 'APPROVED') {
      throw new ConflictException({
        code: 'EXPORT_SOURCE_NOT_READY',
        message: 'A validated generated version is required.',
      });
    }
    const archive = await createDeveloperExportArchive(
      this.workspace.versionSource(projectId, version.versionNumber),
    );
    const id = randomUUID();
    const slug =
      version.project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'angular-project';
    const fileName = `${slug}-v${version.versionNumber}.zip`;
    const storageKey = `projects/${projectId}/versions/${version.versionNumber.toString().padStart(3, '0')}/exports/${id}.zip`;
    await this.storage.put(storageKey, archive.body, 'application/zip');
    try {
      const record = await this.prisma.developerExport.create({
        data: {
          id,
          projectId,
          projectVersionId: versionId,
          storageKey,
          fileName,
          contentHash: archive.contentHash,
          byteSize: archive.body.length,
          fileCount: archive.fileCount,
        },
        include: { _count: { select: { downloads: true } } },
      });
      return this.map(record, record._count.downloads);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async list(
    projectId: string,
    versionId: string,
  ): Promise<DeveloperExportListResponse> {
    this.assertConfiguration();
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
      select: { id: true },
    });
    if (!version) return this.notFound();
    const items = await this.prisma.developerExport.findMany({
      where: { projectId, projectVersionId: versionId },
      include: { _count: { select: { downloads: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return {
      items: items.map((item) => this.map(item, item._count.downloads)),
    };
  }

  async download(
    exportId: string,
    expires: number,
    signature: string,
  ): Promise<{ body: Buffer; fileName: string }> {
    this.assertConfiguration();
    if (
      !Number.isSafeInteger(expires) ||
      expires <= Math.floor(Date.now() / 1000) ||
      !this.validSignature(exportId, expires, signature)
    )
      return this.notFound();
    const record = await this.prisma.developerExport.findUnique({
      where: { id: exportId },
    });
    if (!record) return this.notFound();
    const body = await this.storage.get(record.storageKey, MAX_ZIP_BYTES);
    await this.prisma.exportDownloadAudit.create({ data: { exportId } });
    return { body, fileName: record.fileName };
  }

  async share(
    projectId: string,
    exportId: string,
    recipient: string,
  ): Promise<ShareDeveloperExportResponse> {
    this.assertConfiguration();
    const record = await this.prisma.developerExport.findFirst({
      where: { id: exportId, projectId },
      include: { project: true, projectVersion: true },
    });
    if (!record) return this.notFound();
    const link = this.link(record.id);
    const publicUrl = (
      process.env['APP_PUBLIC_URL'] ?? 'http://127.0.0.1:4200'
    ).replace(/\/$/, '');
    await this.mail.sendMail({
      from:
        process.env['EXPORT_EMAIL_FROM'] ??
        'AJ Mock Hub <no-reply@aj-mock-hub.local>',
      to: recipient,
      subject: `${record.project.name} developer handoff`,
      text: `Download ${record.fileName} for version ${record.projectVersion.versionNumber}: ${publicUrl}${link.url}\n\nThis link expires at ${link.expiresAt.toISOString()}.`,
    });
    return { exportId, recipient, sentAt: new Date().toISOString() };
  }

  private map(
    record: DeveloperExport,
    downloadCount: number,
  ): DeveloperExportResponse {
    const link = this.link(record.id);
    return {
      id: record.id,
      projectId: record.projectId,
      projectVersionId: record.projectVersionId,
      fileName: record.fileName,
      contentHash: record.contentHash,
      byteSize: record.byteSize,
      fileCount: record.fileCount,
      createdAt: record.createdAt.toISOString(),
      downloadUrl: link.url,
      downloadExpiresAt: link.expiresAt.toISOString(),
      downloadCount,
    };
  }

  private link(exportId: string): { url: string; expiresAt: Date } {
    const expires = Math.floor(Date.now() / 1000) + this.ttlSeconds;
    const signature = this.signature(exportId, expires);
    return {
      url: `/api/exports/${exportId}/download?expires=${expires}&signature=${signature}`,
      expiresAt: new Date(expires * 1000),
    };
  }

  private signature(exportId: string, expires: number): string {
    return createHmac('sha256', this.signingSecret)
      .update(`${exportId}.${expires}`)
      .digest('hex');
  }

  private validSignature(
    exportId: string,
    expires: number,
    provided: string,
  ): boolean {
    if (!/^[a-f0-9]{64}$/.test(provided)) return false;
    return timingSafeEqual(
      Buffer.from(this.signature(exportId, expires), 'hex'),
      Buffer.from(provided, 'hex'),
    );
  }

  private assertConfiguration(): void {
    if (
      this.signingSecret.length < 32 ||
      !Number.isSafeInteger(this.ttlSeconds) ||
      this.ttlSeconds < 60 ||
      this.ttlSeconds > 604_800
    ) {
      throw new ServiceUnavailableException({
        code: 'EXPORT_CONFIGURATION_INVALID',
        message: 'Export delivery is not configured safely.',
      });
    }
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'DEVELOPER_EXPORT_NOT_FOUND',
      message: 'Developer export not found.',
    });
  }
}
