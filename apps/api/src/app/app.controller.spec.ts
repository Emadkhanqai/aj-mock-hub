import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from '@aj-mock-hub/database';
import { PipelineQueueService } from './jobs/pipeline-queue.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([1]) },
        },
        {
          provide: PipelineQueueService,
          useValue: { ping: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();
  });

  describe('getHealth', () => {
    it('reports dependency readiness', async () => {
      const appController = app.get<AppController>(AppController);
      await expect(appController.getHealth()).resolves.toMatchObject({
        service: 'api',
        status: 'ok',
        dependencies: { postgresql: 'ok', redis: 'ok' },
      });
    });
  });
});
