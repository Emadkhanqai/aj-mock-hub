import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@aj-mock-hub/contracts';

@Controller('health')
export class AppController {
  @Get()
  getHealth(): HealthResponse {
    return { service: 'api', status: 'ok' };
  }
}
