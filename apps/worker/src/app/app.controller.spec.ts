import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();
  });

  describe('getHealth', () => {
    it('reports that the worker is healthy', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getHealth()).toEqual({
        service: 'worker',
        status: 'ok',
      });
    });
  });
});
