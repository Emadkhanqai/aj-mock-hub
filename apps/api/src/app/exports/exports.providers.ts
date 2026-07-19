import { MinioObjectStorage, type ObjectStorage } from '@aj-mock-hub/storage';

export const EXPORT_STORAGE = Symbol('EXPORT_STORAGE');

export function createExportStorage(): ObjectStorage {
  const accessKey = process.env['MINIO_ROOT_USER'];
  const secretKey = process.env['MINIO_ROOT_PASSWORD'];
  if (!accessKey || !secretKey) {
    const unavailable = async (): Promise<never> => {
      throw new Error('MinIO credentials are not configured');
    };
    return { put: unavailable, get: unavailable, delete: unavailable };
  }
  return new MinioObjectStorage({
    endpoint: process.env['MINIO_ENDPOINT'] ?? '127.0.0.1',
    port: Number(process.env['MINIO_API_PORT'] ?? 19000),
    useSsl: process.env['MINIO_USE_SSL'] === 'true',
    accessKey,
    secretKey,
    bucket: process.env['MINIO_EXPORTS_BUCKET'] ?? 'exports',
  });
}
