import { ServiceUnavailableException } from '@nestjs/common';
import {
  AzureOpenAiRequirementsProvider,
  DeterministicRequirementsProvider,
  type RequirementsProvider,
} from '@aj-mock-hub/generation';
import { MinioObjectStorage, type ObjectStorage } from '@aj-mock-hub/storage';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
export const REQUIREMENTS_PROVIDER = Symbol('REQUIREMENTS_PROVIDER');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function createObjectStorage(): ObjectStorage {
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
    port: Number(process.env['MINIO_API_PORT'] ?? 9000),
    useSsl: process.env['MINIO_USE_SSL'] === 'true',
    accessKey,
    secretKey,
    bucket: process.env['MINIO_REQUIREMENTS_BUCKET'] ?? 'requirements',
  });
}

export function createRequirementsProvider(): RequirementsProvider {
  const provider = process.env['REQUIREMENTS_PROVIDER'] ?? 'local';
  if (provider === 'local') return new DeterministicRequirementsProvider();
  if (provider !== 'azure-openai') {
    throw new Error('REQUIREMENTS_PROVIDER must be local or azure-openai');
  }
  try {
    return new AzureOpenAiRequirementsProvider({
      endpoint: required('AZURE_OPENAI_ENDPOINT'),
      apiKey: required('AZURE_OPENAI_API_KEY'),
      apiVersion: process.env['AZURE_OPENAI_API_VERSION'] ?? '2024-10-21',
      deployment: required('AZURE_OPENAI_DEPLOYMENT'),
      timeoutMs: Number(process.env['AZURE_OPENAI_TIMEOUT_MS'] ?? 60_000),
      maxRetries: Number(process.env['AZURE_OPENAI_MAX_RETRIES'] ?? 2),
    });
  } catch (error: unknown) {
    throw new ServiceUnavailableException({
      code: 'REQUIREMENTS_PROVIDER_MISCONFIGURED',
      message: error instanceof Error ? error.message : 'Provider unavailable.',
    });
  }
}
