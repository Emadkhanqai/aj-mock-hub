import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  PIPELINE_JOB_OPTIONS,
  PipelineQueueData,
  WORKSPACE_PREPARATION_JOB,
  createPipelineQueue,
} from '@aj-mock-hub/job-queue';

@Injectable()
export class PipelineQueueService implements OnModuleDestroy {
  private readonly resources = createPipelineQueue(
    process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  );

  async enqueue(data: PipelineQueueData): Promise<void> {
    await this.resources.queue.add(WORKSPACE_PREPARATION_JOB, data, {
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
}
