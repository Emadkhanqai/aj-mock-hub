import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  PIPELINE_JOB_OPTIONS,
  PipelineQueueData,
  ISOLATED_BUILD_JOB,
  ANGULAR_GENERATION_JOB,
  createPipelineQueue,
  TARGETED_REVISION_JOB,
} from '@aj-mock-hub/job-queue';

@Injectable()
export class PipelineQueueService implements OnModuleDestroy {
  private readonly resources = createPipelineQueue(
    process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  );

  async enqueue(data: PipelineQueueData): Promise<void> {
    await this.resources.queue.add(ISOLATED_BUILD_JOB, data, {
      ...PIPELINE_JOB_OPTIONS,
      jobId: data.pipelineJobId,
    });
  }

  async enqueueGeneration(data: PipelineQueueData): Promise<void> {
    await this.resources.queue.add(ANGULAR_GENERATION_JOB, data, {
      ...PIPELINE_JOB_OPTIONS,
      jobId: data.pipelineJobId,
    });
  }

  async enqueueRevision(data: PipelineQueueData): Promise<void> {
    await this.resources.queue.add(TARGETED_REVISION_JOB, data, {
      ...PIPELINE_JOB_OPTIONS,
      jobId: data.pipelineJobId,
    });
  }

  async removeIfPending(pipelineJobId: string): Promise<boolean> {
    const job = await this.resources.queue.getJob(pipelineJobId);
    if (!job) return true;
    const state = await job.getState();
    if (
      !['waiting', 'delayed', 'prioritized', 'waiting-children'].includes(state)
    ) {
      return false;
    }
    await job.remove();
    return true;
  }

  async onModuleDestroy(): Promise<void> {
    await this.resources.queue.close();
    this.resources.connection.disconnect();
  }

  async ping(): Promise<void> {
    await this.resources.connection.ping();
  }
}
