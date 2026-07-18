import { JobsOptions, Queue, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

export const PIPELINE_QUEUE_NAME =
  process.env['PIPELINE_QUEUE_NAME'] ?? 'aj-mock-hub-pipeline';
export const ISOLATED_BUILD_JOB = 'isolated-build';

export interface PipelineQueueData {
  pipelineJobId: string;
  projectId: string;
  projectVersionId: string;
  versionNumber: number;
}

export const PIPELINE_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86400, count: 5000 },
};

export function createRedisConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, {
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
  });
}

export function createPipelineQueue(redisUrl: string) {
  const connection = createRedisConnection(redisUrl);
  const queue = new Queue<PipelineQueueData>(PIPELINE_QUEUE_NAME, {
    connection,
  });
  return { connection, queue };
}

export function pipelineWorkerOptions(redisUrl: string): {
  connection: IORedis;
  options: WorkerOptions;
} {
  const connection = createRedisConnection(redisUrl);
  return {
    connection,
    options: { connection, concurrency: 2 },
  };
}
