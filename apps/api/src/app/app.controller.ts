import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@aj-mock-hub/contracts';
import { PrismaService } from '@aj-mock-hub/database';
import { PipelineQueueService } from './jobs/pipeline-queue.service';

@Controller('health')
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: PipelineQueueService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const dependencies: Record<string, 'ok' | 'unavailable'> = {
      postgresql: 'unavailable',
      redis: 'unavailable',
    };
    await Promise.all([
      this.prisma.$queryRaw`SELECT 1`
        .then(() => (dependencies.postgresql = 'ok'))
        .catch(() => undefined),
      this.queue
        .ping()
        .then(() => (dependencies.redis = 'ok'))
        .catch(() => undefined),
    ]);
    return {
      service: 'api',
      status: Object.values(dependencies).every((value) => value === 'ok')
        ? 'ok'
        : 'degraded',
      dependencies,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
