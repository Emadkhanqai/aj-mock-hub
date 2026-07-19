import { Client } from 'minio';
import type { Readable } from 'node:stream';

export const MAX_REQUIREMENT_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface StoredObject {
  key: string;
  size: number;
  contentType: string;
}

export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string, maximumBytes?: number): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export interface MinioObjectStorageOptions {
  endpoint: string;
  port: number;
  useSsl: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export class MinioObjectStorage implements ObjectStorage {
  private readonly client: Client;

  constructor(private readonly options: MinioObjectStorageOptions) {
    this.client = new Client({
      endPoint: options.endpoint,
      port: options.port,
      useSSL: options.useSsl,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
    });
  }

  async ensureBucket(): Promise<void> {
    if (!(await this.client.bucketExists(this.options.bucket))) {
      await this.client.makeBucket(this.options.bucket);
    }
  }

  async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredObject> {
    this.assertKey(key);
    await this.ensureBucket();
    await this.client.putObject(this.options.bucket, key, body, body.length, {
      'Content-Type': contentType,
    });
    return { key, size: body.length, contentType };
  }

  async get(
    key: string,
    maximumBytes = MAX_REQUIREMENT_DOCUMENT_BYTES,
  ): Promise<Buffer> {
    this.assertKey(key);
    const stream = await this.client.getObject(this.options.bucket, key);
    return this.readBounded(stream, maximumBytes);
  }

  async delete(key: string): Promise<void> {
    this.assertKey(key);
    await this.client.removeObject(this.options.bucket, key);
  }

  private assertKey(key: string): void {
    if (
      !key ||
      key.startsWith('/') ||
      key.includes('..') ||
      key.includes('\\') ||
      !/^[a-zA-Z0-9/_\-.]+$/.test(key)
    ) {
      throw new Error('Object storage key is invalid');
    }
  }

  private async readBounded(
    stream: Readable,
    maximumBytes: number,
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > maximumBytes) {
        stream.destroy();
        throw new Error('Stored object exceeds the configured size limit');
      }
      chunks.push(buffer);
    }
    return Buffer.concat(chunks);
  }
}
